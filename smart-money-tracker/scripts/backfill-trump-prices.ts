/**
 * Backfill Trump Watch mention prices and checkpoint reactions.
 * Usage:
 *   pnpm backfill:trump-prices
 *   pnpm backfill:trump-prices -- --limit 5
 *   pnpm backfill:trump-prices -- --limit 20 --batch-size 5
 */
import '../lib/load-env'
import { backfillAllTrumpPrices } from '../lib/trump/priceEnricher'

function parseArg(name: string): number | undefined {
  const idx = process.argv.indexOf(name)
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined
  const value = Number(process.argv[idx + 1])
  return Number.isFinite(value) && value > 0 ? value : undefined
}

async function main() {
  const limit = parseArg('--limit')
  const batchSize = parseArg('--batch-size') ?? 10

  console.log('Backfilling Trump Watch prices...')
  if (limit != null) console.log(`  limit: ${limit}`)
  console.log(`  batch-size: ${batchSize}`)

  const result = await backfillAllTrumpPrices({
    limit,
    batchSize,
    onProgress: ({ index, total, ticker }) => {
      console.log(`Processing ${index}/${total} mentions (${ticker})...`)
    },
  })

  console.log('Backfill complete:', {
    fieldsUpdated: result.fieldsUpdated,
    updated: result.updated,
    skipped: result.skipped,
    rateLimited: result.rateLimited,
    total: result.total,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
