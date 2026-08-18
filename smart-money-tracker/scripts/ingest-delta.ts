/**
 * Delta sync: fetch recent 13F-HR filings from SEC EFTS and trigger re-ingest hints.
 * For filings between quarterly bulk drops, logs new CIKs for manual follow-up.
 */
import '../lib/load-env'
import { getPool, padCikDb } from '../lib/db'
import { USER_AGENT } from '../lib/ingest-utils'

async function fetchRecent13F(days: number) {
  const startdt = dateMinusDays(days)
  const url = `https://efts.sec.gov/LATEST/search-index?q=%2213F-HR%22&dateRange=custom&startdt=${startdt}&forms=13F-HR&_source=file_date,entity_name,cik,file_num,period_of_report`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`EFTS failed: ${res.status}`)
  const data = await res.json()
  const hits =
    (data as { hits?: { hits?: Array<{ _source?: Record<string, string> }> } })
      ?.hits?.hits ?? []
  return hits.map((h) => h._source ?? {})
}

async function main() {
  const pool = getPool()
  const days = Number(process.env.INGEST_DELTA_DAYS ?? 14)
  const runRes = await pool.query<{ id: string }>(
    `INSERT INTO ingestion_runs (source, quarter_label, status)
     VALUES ('efts-delta', $1, 'running') RETURNING id`,
    [`last-${days}-days`]
  )
  const runId = Number(runRes.rows[0].id)

  try {
    let filings: Awaited<ReturnType<typeof fetchRecent13F>>
    try {
      filings = await fetchRecent13F(days)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`EFTS unavailable (${message}); skipping delta sync`)
      await pool.query(
        `UPDATE ingestion_runs SET finished_at = NOW(), status = 'skipped',
         error_message = $2 WHERE id = $1`,
        [runId, message]
      )
      return
    }
    let newFilers = 0
    let knownFilers = 0

    for (const src of filings) {
      const cik = padCikDb(src.cik ?? '')
      const name = src.entity_name ?? 'Unknown'
      if (!cik) continue

      const existing = await pool.query(
        'SELECT cik FROM filers WHERE cik = $1',
        [cik]
      )
      if (existing.rows.length) {
        knownFilers++
        await pool.query(
          `UPDATE filers SET last_filing_date = GREATEST(
             COALESCE(last_filing_date, '1900-01-01'::date),
             $2::date
           ), updated_at = NOW() WHERE cik = $1`,
          [cik, (src.file_date ?? '').slice(0, 10)]
        )
      } else {
        newFilers++
        await pool.query(
          `INSERT INTO filers (cik, name, investor_type, last_filing_date, avatar_initials, avatar_color)
           VALUES ($1, $2, 'unknown', $3::date, $4, 'blue')
           ON CONFLICT (cik) DO NOTHING`,
          [
            cik,
            name,
            (src.file_date ?? '').slice(0, 10),
            name.slice(0, 2).toUpperCase(),
          ]
        )
      }
    }

    const counts = {
      eftsFilings: filings.length,
      knownFilers,
      newFilers,
    }

    await pool.query(
      `UPDATE ingestion_runs SET finished_at = NOW(), status = 'success',
       row_counts = $2::jsonb WHERE id = $1`,
      [runId, JSON.stringify(counts)]
    )

    console.log('Delta sync complete:', counts)
    if (newFilers > 0) {
      console.log(
        `Note: ${newFilers} new filers discovered. Run full ingest:13f for complete holdings.`
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await pool.query(
      `UPDATE ingestion_runs SET finished_at = NOW(), status = 'failed', error_message = $2 WHERE id = $1`,
      [runId, message]
    )
    throw err
  } finally {
    await pool.end()
  }
}

function dateMinusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
