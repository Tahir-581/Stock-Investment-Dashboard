/**
 * Seed cusip_ticker_map from SEC company_tickers.json (CIK-based)
 * and a built-in list of common ETF/stock CUSIPs.
 */
import '../lib/load-env'
import { getPool } from '../lib/db'
import { USER_AGENT } from '../lib/ingest-utils'

const KNOWN_CUSIPS: Record<string, { ticker: string; name: string }> = {
  '78462F103': { ticker: 'SPY', name: 'SPDR S&P 500 ETF' },
  '037833100': { ticker: 'AAPL', name: 'Apple Inc' },
  '594918104': { ticker: 'MSFT', name: 'Microsoft Corp' },
  '67066G104': { ticker: 'NVDA', name: 'NVIDIA Corp' },
  '023135106': { ticker: 'AMZN', name: 'Amazon.com Inc' },
  '30303M102': { ticker: 'META', name: 'Meta Platforms Inc' },
  '02079K305': { ticker: 'GOOGL', name: 'Alphabet Inc' },
  '88160R101': { ticker: 'TSLA', name: 'Tesla Inc' },
  '46625H100': { ticker: 'JPM', name: 'JPMorgan Chase & Co' },
  '92826C839': { ticker: 'V', name: 'Visa Inc' },
  '084670702': { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc' },
  '025816109': { ticker: 'AXP', name: 'American Express Co' },
  '949746101': { ticker: 'KO', name: 'Coca-Cola Co' },
  '742718109': { ticker: 'PG', name: 'Procter & Gamble Co' },
  '931142103': { ticker: 'WMT', name: 'Walmart Inc' },
  '459200101': { ticker: 'IBM', name: 'IBM Corp' },
  '036752103': { ticker: 'EQT', name: 'EQT Corp' },
  '438516106': { ticker: 'HON', name: 'Honeywell International' },
}

async function main() {
  const pool = getPool()
  let upserted = 0

  for (const [cusip, info] of Object.entries(KNOWN_CUSIPS)) {
    await pool.query(
      `INSERT INTO cusip_ticker_map (cusip, ticker, company_name, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (cusip) DO UPDATE SET ticker = EXCLUDED.ticker,
         company_name = EXCLUDED.company_name, updated_at = NOW()`,
      [cusip, info.ticker, info.name]
    )
    upserted++
  }

  try {
    const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (res.ok) {
      const data = (await res.json()) as Record<
        string,
        { cik_str: number; ticker: string; title: string }
      >
      for (const entry of Object.values(data)) {
        if (!entry.ticker) continue
        await pool.query(
          `INSERT INTO cusip_ticker_map (cusip, ticker, company_name, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (cusip) DO NOTHING`,
          [`CIK${String(entry.cik_str).padStart(10, '0')}`, entry.ticker, entry.title]
        )
      }
      console.log('Loaded SEC company_tickers.json')
    }
  } catch {
    console.warn('Could not fetch company_tickers.json')
  }

  try {
    await pool.query(`
    UPDATE holdings h SET ticker = m.ticker
    FROM cusip_ticker_map m
    WHERE h.cusip = m.cusip AND (h.ticker IS NULL OR h.ticker = '')
  `)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`Skipping holdings ticker refresh: ${message}`)
  }

  console.log(`Ticker map seeded (${upserted} known CUSIPs)`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
