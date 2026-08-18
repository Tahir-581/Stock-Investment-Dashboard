/**
 * Ingest SEC Form 13F quarterly bulk dataset into Postgres.
 * Usage: npm run ingest:13f [-- --url <zip-url>] [-- --prior]
 */
import '../lib/load-env'
import AdmZip from 'adm-zip'
import { backfillFilerSummaries } from '../lib/backfill-filer-summaries'
import { getPool, padCikDb } from '../lib/db'
import {
  avatarColorForCik,
  classifyInvestorType,
  fetchSecBuffer,
  getField,
  initialsFromName,
  isValidCik,
  normalize13FValue,
  parseSecDate,
  parseTsvHeader,
  parseTsvLine,
  resolveLatest13FZipUrl,
} from '../lib/ingest-utils'

type CoverPage = {
  accessionNumber: string
  cik: string
  name: string
  reportPeriod: string
  filedAt: string
  formType: string
}

const BATCH_SIZE = 5000

async function startIngestionRun(
  quarterLabel: string,
  source: string
): Promise<number> {
  const pool = getPool()
  const res = await pool.query<{ id: string }>(
    `INSERT INTO ingestion_runs (source, quarter_label, status)
     VALUES ($1, $2, 'running') RETURNING id`,
    [source, quarterLabel]
  )
  return Number(res.rows[0].id)
}

async function finishIngestionRun(
  id: number,
  status: string,
  rowCounts: Record<string, number>,
  errorMessage?: string
) {
  const pool = getPool()
  await pool.query(
    `UPDATE ingestion_runs SET finished_at = NOW(), status = $2,
     row_counts = $3::jsonb, error_message = $4 WHERE id = $1`,
    [id, status, JSON.stringify(rowCounts), errorMessage ?? null]
  )
}

function readZipEntry(zip: AdmZip, namePattern: RegExp): string | null {
  const entry = zip
    .getEntries()
    .find((e) => !e.isDirectory && namePattern.test(e.entryName))
  if (!entry) return null
  return zip.readAsText(entry, 'utf8')
}

function parseCoverPages(content: string): Map<string, CoverPage> {
  const lines = content.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return new Map()
  const header = parseTsvHeader(lines[0])
  const map = new Map<string, CoverPage>()

  for (let i = 1; i < lines.length; i++) {
    const row = parseTsvLine(lines[i])
    const accessionNumber = getField(row, header, 'ACCESSION_NUMBER')
    if (!accessionNumber) continue
    const cikRaw = getField(row, header, 'CIK')
    const cik = cikRaw ? padCikDb(cikRaw) : ''
    const name =
      getField(row, header, 'FILINGMANAGER_NAME') ||
      getField(row, header, 'NAME')
    const reportPeriod = parseSecDate(
      getField(row, header, 'REPORTCALENDARORQUARTER') ||
        getField(row, header, 'REPORTCALENDARORQUARTERENDDATE')
    )
    const filedAt = parseSecDate(
      getField(row, header, 'FILING_DATE') ||
        getField(row, header, 'FILINGDATE') ||
        getField(row, header, 'SIGNATUREDATE') ||
        getField(row, header, 'DATEREPORTED')
    )
    const formType = getField(row, header, 'FORM13FFILINGSREPORTTYPE') || '13F-HR'

    map.set(accessionNumber, {
      accessionNumber,
      cik,
      name,
      reportPeriod,
      filedAt: filedAt || reportPeriod,
      formType,
    })
  }
  return map
}

function parseSubmissions(content: string): Map<string, string> {
  const lines = content.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return new Map()
  const header = parseTsvHeader(lines[0])
  const map = new Map<string, string>()
  for (let i = 1; i < lines.length; i++) {
    const row = parseTsvLine(lines[i])
    const accession = getField(row, header, 'ACCESSION_NUMBER')
    const cikRaw = getField(row, header, 'CIK')
    const cik = cikRaw.replace(/\D/g, '').padStart(10, '0')
    if (!isValidCik(cik)) continue
    map.set(accession, cik)
  }
  return map
}

async function applyTickerMap(pool: ReturnType<typeof getPool>) {
  await pool.query(`
    UPDATE holdings h SET ticker = m.ticker
    FROM cusip_ticker_map m
    WHERE h.cusip = m.cusip AND (h.ticker IS NULL OR h.ticker = '')
  `)
}

async function computeQoQForPeriod(
  pool: ReturnType<typeof getPool>,
  reportPeriod: string
) {
  const priorRes = await pool.query<{ report_period: string }>(
    `SELECT report_period::text FROM (
       SELECT DISTINCT report_period FROM holdings
       WHERE report_period < $1::date
     ) p ORDER BY report_period DESC LIMIT 1`,
    [reportPeriod]
  )
  const priorPeriod = priorRes.rows[0]?.report_period
  if (!priorPeriod) return

  await pool.query(
    `UPDATE holdings AS cur SET
       qoq_change_pct = CASE
         WHEN prev.shares IS NULL OR prev.shares = 0 THEN 0
         ELSE LEAST(999999.9999::numeric, GREATEST(-999999.9999::numeric,
           ROUND(((cur.shares - prev.shares)::numeric / prev.shares) * 100, 4)))
       END,
       is_new = (prev.shares IS NULL)
     FROM (
       SELECT cik, cusip, name_of_issuer, shares
       FROM holdings WHERE report_period = $2::date
     ) AS prev
     WHERE cur.report_period = $1::date
       AND cur.cik = prev.cik
       AND cur.cusip = prev.cusip
       AND cur.name_of_issuer = prev.name_of_issuer`,
    [reportPeriod, priorPeriod]
  )

  await pool.query(
    `UPDATE holdings AS cur SET is_new = true, qoq_change_pct = 100
     WHERE cur.report_period = $1::date
       AND NOT EXISTS (
         SELECT 1 FROM holdings prev
         WHERE prev.cik = cur.cik AND prev.report_period = $2::date
           AND prev.cusip = cur.cusip AND prev.name_of_issuer = cur.name_of_issuer
       )`,
    [reportPeriod, priorPeriod]
  )
}

async function upsertFilerStub(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  cover: CoverPage
) {
  if (!isValidCik(cover.cik)) return
  await client.query(
    `INSERT INTO filers (cik, name, investor_type, avatar_initials, avatar_color)
     VALUES ($1, $2, $3::investor_type, $4, $5)
     ON CONFLICT (cik) DO UPDATE SET
       name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE filers.name END,
       updated_at = NOW()`,
    [
      cover.cik,
      cover.name || 'Unknown filer',
      classifyInvestorType(cover.name),
      initialsFromName(cover.name || 'UN'),
      avatarColorForCik(cover.cik),
    ]
  )
}

async function upsertFilerSummary(
  pool: ReturnType<typeof getPool>,
  cik: string,
  cover: CoverPage
) {
  const stats = await pool.query<{
    total_value: string
    holdings_count: string
    top_ticker: string | null
    top_pct: string
  }>(
    `SELECT COALESCE(SUM(value_usd), 0)::text AS total_value,
            COUNT(*)::text AS holdings_count,
            (SELECT COALESCE(ticker, LEFT(cusip, 6)) FROM holdings
             WHERE cik = $1 AND report_period = $2::date
             ORDER BY value_usd DESC LIMIT 1) AS top_ticker,
            (SELECT portfolio_pct::text FROM holdings
             WHERE cik = $1 AND report_period = $2::date
             ORDER BY portfolio_pct DESC LIMIT 1) AS top_pct
     FROM holdings WHERE cik = $1 AND report_period = $2::date`,
    [cik, cover.reportPeriod]
  )
  const s = stats.rows[0]
  const investorType = classifyInvestorType(cover.name)

  await pool.query(
    `INSERT INTO filers (
       cik, name, investor_type, last_report_period, last_filing_date,
       total_portfolio_value, holdings_count, top_ticker, top_pct,
       avatar_initials, avatar_color, updated_at
     ) VALUES ($1,$2,$3::investor_type,$4::date,$5::date,$6,$7,$8,$9,$10,$11,NOW())
     ON CONFLICT (cik) DO UPDATE SET
       name = EXCLUDED.name,
       investor_type = EXCLUDED.investor_type,
       last_report_period = CASE
         WHEN EXCLUDED.last_report_period >= filers.last_report_period
         THEN EXCLUDED.last_report_period ELSE filers.last_report_period END,
       last_filing_date = CASE
         WHEN EXCLUDED.last_report_period >= filers.last_report_period
         THEN EXCLUDED.last_filing_date ELSE filers.last_filing_date END,
       total_portfolio_value = CASE
         WHEN EXCLUDED.last_report_period >= filers.last_report_period
         THEN EXCLUDED.total_portfolio_value ELSE filers.total_portfolio_value END,
       holdings_count = CASE
         WHEN EXCLUDED.last_report_period >= filers.last_report_period
         THEN EXCLUDED.holdings_count ELSE filers.holdings_count END,
       top_ticker = CASE
         WHEN EXCLUDED.last_report_period >= filers.last_report_period
         THEN EXCLUDED.top_ticker ELSE filers.top_ticker END,
       top_pct = CASE
         WHEN EXCLUDED.last_report_period >= filers.last_report_period
         THEN EXCLUDED.top_pct ELSE filers.top_pct END,
       updated_at = NOW()`,
    [
      cik,
      cover.name,
      investorType,
      cover.reportPeriod,
      cover.filedAt || cover.reportPeriod,
      Number(s?.total_value ?? 0),
      Number(s?.holdings_count ?? 0),
      s?.top_ticker ?? '',
      Number(s?.top_pct ?? 0),
      initialsFromName(cover.name),
      avatarColorForCik(cik),
    ]
  )
}

async function ingestZipBuffer(
  buffer: ArrayBuffer,
  quarterLabel: string
): Promise<Record<string, number>> {
  const pool = getPool()
  const zip = new AdmZip(Buffer.from(buffer))

  const submissionText = readZipEntry(zip, /SUBMISSION\.tsv$/i)
  const coverText = readZipEntry(zip, /COVERPAGE\.tsv$/i)
  const infoText = readZipEntry(zip, /INFOTABLE\.tsv$/i)

  if (!coverText || !infoText) {
    throw new Error('ZIP missing COVERPAGE.tsv or INFOTABLE.tsv')
  }

  const submissionMap = submissionText
    ? parseSubmissions(submissionText)
    : new Map<string, string>()
  const coverMap = parseCoverPages(coverText)

  for (const [accession, cover] of coverMap) {
    if (!cover.cik && submissionMap.has(accession)) {
      cover.cik = submissionMap.get(accession)!
    }
  }

  // Filers are upserted per batch in flushHoldingsBatch
  console.log('Parsing info table...')
  const infoLines = infoText.split(/\r?\n/).filter(Boolean)
  console.log(`Info rows: ${infoLines.length - 1}`)
  const infoHeader = parseTsvHeader(infoLines[0])
  const accessionToCover = coverMap

  let filersUpserted = 0
  let holdingsInserted = 0
  const processedAccessions = new Set<string>()
  const reportPeriods = new Set<string>()

  let batch: {
    accession: string
    cik: string
    period: string
    nameOfIssuer: string
    titleOfClass: string
    cusip: string
    valueUsd: number
    shares: number
    infotableSk: string
    portfolioPct: number
  }[] = []

  const accessionTotals = new Map<string, number>()

  for (let i = 1; i < infoLines.length; i++) {
    const row = parseTsvLine(infoLines[i])
    const accessionNumber = getField(row, infoHeader, 'ACCESSION_NUMBER')
    if (!accessionNumber) continue

    const cover = accessionToCover.get(accessionNumber)
    if (!cover?.cik || !cover.reportPeriod || !isValidCik(cover.cik)) continue

    const nameOfIssuer = getField(row, infoHeader, 'NAMEOFISSUER')
    const cusip = getField(row, infoHeader, 'CUSIP')
    if (!nameOfIssuer && !cusip) continue

    const valueUsd = normalize13FValue(
      getField(row, infoHeader, 'VALUE'),
      cover.reportPeriod
    )
    const shares =
      Number(getField(row, infoHeader, 'SSHPRNAMT').replace(/,/g, '')) || 0

    accessionTotals.set(
      accessionNumber,
      (accessionTotals.get(accessionNumber) ?? 0) + valueUsd
    )

    batch.push({
      accession: accessionNumber,
      cik: cover.cik,
      period: cover.reportPeriod,
      nameOfIssuer,
      titleOfClass: getField(row, infoHeader, 'TITLEOFCLASS'),
      cusip,
      valueUsd,
      shares,
      infotableSk: getField(row, infoHeader, 'INFOTABLE_SK'),
      portfolioPct: 0,
    })

    if (batch.length >= BATCH_SIZE) {
      holdingsInserted += await flushHoldingsBatch(
        pool,
        batch,
        accessionTotals,
        accessionToCover,
        processedAccessions,
        reportPeriods
      )
      console.log(`Inserted ${holdingsInserted} holdings so far...`)
      batch = []
    }
  }

  if (batch.length) {
    holdingsInserted += await flushHoldingsBatch(
      pool,
      batch,
      accessionTotals,
      accessionToCover,
      processedAccessions,
      reportPeriods
    )
  }

  for (const accession of processedAccessions) {
    const cover = accessionToCover.get(accession)
    if (!cover?.cik) continue
    await upsertFilerSummary(pool, cover.cik, cover)
    filersUpserted++
  }

  await applyTickerMap(pool)

  for (const period of reportPeriods) {
    await computeQoQForPeriod(pool, period)
  }

  const backfill = await backfillFilerSummaries(pool)
  console.log(`Backfilled ${backfill.updated} filer summaries from holdings`)

  return {
    filers: filersUpserted,
    holdings: holdingsInserted,
    filings: processedAccessions.size,
    periods: reportPeriods.size,
    filersBackfilled: backfill.updated,
  }
}

async function flushHoldingsBatch(
  pool: ReturnType<typeof getPool>,
  batch: {
    accession: string
    cik: string
    period: string
    nameOfIssuer: string
    titleOfClass: string
    cusip: string
    valueUsd: number
    shares: number
    infotableSk: string
    portfolioPct: number
  }[],
  accessionTotals: Map<string, number>,
  accessionToCover: Map<string, CoverPage>,
  processedAccessions: Set<string>,
  reportPeriods: Set<string>
): Promise<number> {
  const client = await pool.connect()
  let inserted = 0
  try {
    await client.query('BEGIN')

    const deduped = new Map<string, (typeof batch)[number]>()
    for (const item of batch) {
      if (!isValidCik(item.cik)) continue
      const key = `${item.accession}|${item.cusip}|${item.nameOfIssuer}|${item.titleOfClass}`
      const existing = deduped.get(key)
      if (existing) {
        existing.valueUsd += item.valueUsd
        existing.shares += item.shares
      } else {
        deduped.set(key, { ...item })
      }
    }

    for (const item of deduped.values()) {
      const total = accessionTotals.get(item.accession) ?? item.valueUsd
      item.portfolioPct = total > 0 ? (item.valueUsd / total) * 100 : 0
    }

    const accessionsInBatch = new Set<string>()
    const supersededAccessions = new Set<string>()
    for (const item of deduped.values()) {
      accessionsInBatch.add(item.accession)
    }

    for (const accession of accessionsInBatch) {
      if (processedAccessions.has(accession)) continue
      const cover = accessionToCover.get(accession)
      const sample = [...deduped.values()].find((d) => d.accession === accession)
      if (!cover || !sample || !isValidCik(sample.cik)) continue

      await upsertFilerStub(client, cover)
      const replaced = await client.query<{ accession_number: string }>(
        `DELETE FROM filings_13f
         WHERE cik = $1 AND report_period = $2::date AND accession_number <> $3
         RETURNING accession_number`,
        [sample.cik, sample.period, accession]
      )
      for (const row of replaced.rows) {
        supersededAccessions.add(row.accession_number)
      }
      await client.query(
        `INSERT INTO filings_13f (accession_number, cik, report_period, filed_at, form_type, quarter_label)
         VALUES ($1,$2,$3::date,$4::date,$5,$6)
         ON CONFLICT (accession_number) DO UPDATE SET
           report_period = EXCLUDED.report_period,
           filed_at = EXCLUDED.filed_at`,
        [
          accession,
          sample.cik,
          sample.period,
          cover.filedAt || sample.period,
          cover.formType,
          sample.period,
        ]
      )
      await client.query(
        `DELETE FROM holdings WHERE accession_number = $1`,
        [accession]
      )
      processedAccessions.add(accession)
      reportPeriods.add(sample.period)
    }

    const values: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    for (const item of deduped.values()) {
      if (supersededAccessions.has(item.accession)) continue
      values.push(
        `($${paramIdx},$${paramIdx + 1},$${paramIdx + 2}::date,$${paramIdx + 3},$${paramIdx + 4},$${paramIdx + 5},$${paramIdx + 6},$${paramIdx + 7},$${paramIdx + 8},$${paramIdx + 9})`
      )
      params.push(
        item.accession,
        item.cik,
        item.period,
        item.nameOfIssuer,
        item.cusip,
        item.titleOfClass,
        item.valueUsd,
        item.shares,
        item.portfolioPct,
        item.infotableSk ? Number(item.infotableSk) : null
      )
      paramIdx += 10
      inserted++
    }

    if (values.length) {
      await client.query(
        `INSERT INTO holdings (
           accession_number, cik, report_period, name_of_issuer, cusip,
           title_of_class, value_usd, shares, portfolio_pct, infotable_sk
         ) VALUES ${values.join(',')}
         ON CONFLICT (accession_number, cusip, name_of_issuer, title_of_class)
         DO UPDATE SET value_usd = EXCLUDED.value_usd, shares = EXCLUDED.shares,
           portfolio_pct = EXCLUDED.portfolio_pct`,
        params
      )
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
  return inserted
}

async function main() {
  const args = process.argv.slice(2)
  const urlArgIdx = args.indexOf('--url')
  const customUrl = urlArgIdx >= 0 ? args[urlArgIdx + 1] : undefined
  const ingestPrior = args.includes('--prior')

  let zipUrl: string
  let quarterLabel: string

  if (customUrl) {
    zipUrl = customUrl
    quarterLabel = 'custom'
  } else {
    const resolved = await resolveLatest13FZipUrl()
    zipUrl = resolved.url
    quarterLabel = resolved.label
  }

  console.log(`Downloading 13F dataset: ${zipUrl}`)
  const runId = await startIngestionRun(quarterLabel, zipUrl)

  try {
    const buffer = await fetchSecBuffer(zipUrl)
    console.log(`Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB`)
    const counts = await ingestZipBuffer(buffer, quarterLabel)
    console.log('Ingestion counts:', counts)

    if (ingestPrior) {
      console.log('Prior quarter ingestion requested — set SEC_13F_ZIP_URL to prior ZIP and re-run')
    }

    await finishIngestionRun(runId, 'success', counts)
    console.log('Ingestion complete')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await finishIngestionRun(runId, 'failed', {}, message)
    throw err
  } finally {
    await getPool().end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
