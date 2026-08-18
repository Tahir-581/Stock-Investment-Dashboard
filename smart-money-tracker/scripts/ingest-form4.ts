/**
 * Ingest Form 4 insider filings from SEC atom feed into insiders table.
 */
import '../lib/load-env'
import { getPool } from '../lib/db'
import { USER_AGENT } from '../lib/ingest-utils'

async function fetchForm4Atom(count = 100): Promise<
  {
    title: string
    filedAt: string
    link: string
  }[]
> {
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&dateb=&owner=include&count=${count}&search_text=&output=atom`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`Form 4 atom failed: ${res.status}`)
  const xml = await res.text()
  const entries = xml.split('<entry>').slice(1)
  const results: { title: string; filedAt: string; link: string }[] = []

  for (const entry of entries) {
    const title =
      entry.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? 'Form 4'
    const filedAt =
      entry.match(/<updated>([^<]+)<\/updated>/i)?.[1] ??
      new Date().toISOString()
    const link =
      entry.match(/<link[^>]+href="([^"]+)"/i)?.[1] ?? `form4-${results.length}`
    results.push({ title, filedAt, link })
  }
  return results
}

function parseForm4Title(title: string): {
  name: string
  companyName: string
  action: string | null
} {
  const parts = title.split(' - ')
  const name = parts[0]?.trim() ?? title
  const rest = parts.slice(1).join(' - ')
  const action = /sell|sold|disposition/i.test(title)
    ? 'sell'
    : /buy|purchase|acquired/i.test(title)
      ? 'buy'
      : null
  const companyMatch = rest.match(/\(([^)]+)\)/)
  const companyName = companyMatch?.[1] ?? rest.slice(0, 80)
  return { name, companyName, action }
}

function isStorageLimit(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('project size limit') || message.includes('53100')
}

async function main() {
  const pool = getPool()
  const count = Number(process.env.FORM4_COUNT ?? 100)

  let runId: number
  try {
    const runRes = await pool.query<{ id: string }>(
      `INSERT INTO ingestion_runs (source, quarter_label, status)
       VALUES ('form4-atom', 'recent', 'running') RETURNING id`
    )
    runId = Number(runRes.rows[0].id)
  } catch (err) {
    if (isStorageLimit(err)) {
      console.warn('Neon storage limit reached; skipping Form 4 ingest')
      await pool.end()
      return
    }
    throw err
  }

  try {
    const entries = await fetchForm4Atom(count)
    let inserted = 0

    for (const entry of entries) {
      const { name, companyName, action } = parseForm4Title(entry.title)
      const accession = entry.link.split('/').pop()?.replace(/-index\.htm.*/, '') ?? entry.link

      const res = await pool.query(
        `INSERT INTO insiders (
           name, company_name, form_type, filed_at, action, accession_number
         ) VALUES ($1, $2, '4', $3::timestamptz, $4, $5)
         ON CONFLICT (accession_number, name, transaction_date, action, shares) DO NOTHING
         RETURNING id`,
        [name, companyName, entry.filedAt, action, accession]
      )
      if (res.rowCount) inserted++
    }

    await pool.query(
      `UPDATE ingestion_runs SET finished_at = NOW(), status = 'success',
       row_counts = $2::jsonb WHERE id = $1`,
      [runId, JSON.stringify({ fetched: entries.length, inserted })]
    )

    console.log(`Form 4 ingest: ${inserted} new rows from ${entries.length} entries`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (isStorageLimit(err)) {
      console.warn(`Neon storage limit reached during Form 4 ingest: ${message}`)
      try {
        await pool.query(
          `UPDATE ingestion_runs SET finished_at = NOW(), status = 'skipped', error_message = $2 WHERE id = $1`,
          [runId, message]
        )
      } catch {
        // ignore secondary update failure
      }
      return
    }
    await pool.query(
      `UPDATE ingestion_runs SET finished_at = NOW(), status = 'failed', error_message = $2 WHERE id = $1`,
      [runId, message]
    )
    throw err
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
