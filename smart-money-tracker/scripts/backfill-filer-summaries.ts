/**
 * Backfill filers AUM / holdings_count / top position from holdings table.
 * Usage: npm run backfill:filers
 */
import '../lib/load-env'
import { backfillFilerSummaries } from '../lib/backfill-filer-summaries'
import { getPool, isDatabaseConfigured } from '../lib/db'

async function main() {
  if (!isDatabaseConfigured()) {
    console.error(
      'DATABASE_URL is not set. Create smart-money-tracker/.env.local from .env.example and set your Postgres URL.'
    )
    process.exit(1)
  }

  const pool = getPool()
  console.log('Backfilling filer summaries from holdings...')
  const { updated } = await backfillFilerSummaries(pool)
  console.log(`Updated ${updated} filers.`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
