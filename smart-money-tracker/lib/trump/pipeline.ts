import { fetchAllSources } from './sources'
import { extractMentionsFromText } from './extractor'
import { enrichWithPrice } from './priceEnricher'
import { insertMention, queryMentions } from './db'

export async function runTrumpWatchPipeline(): Promise<{
  processed: number
  newMentions: number
  errors: string[]
}> {
  const errors: string[] = []
  let processed = 0
  let newMentions = 0

  try {
    const posts = await fetchAllSources()
    processed = posts.length

    if (posts.length === 0) {
      return { processed: 0, newMentions: 0, errors: [] }
    }

    const existingDb = queryMentions({ limit: 200 })
    const existingIds = new Set(
      existingDb.map((r) => r.source_post_id as string)
    )
    const newPosts = posts.filter((p) => !existingIds.has(p.id))

    if (newPosts.length === 0) {
      return { processed, newMentions: 0, errors: [] }
    }

    for (const post of newPosts) {
      try {
        const mentions = extractMentionsFromText(post.text, post)

        for (const mention of mentions) {
          const prices = await enrichWithPrice({
            ticker: mention.ticker,
            postedAt: mention.postedAt,
          })

          const inserted = insertMention({
            ticker: mention.ticker,
            company_name: mention.companyName,
            sector: mention.sector ?? null,
            sentiment: mention.sentiment,
            mention_type: mention.mentionType ?? null,
            trump_quote: mention.trumpQuote,
            context: mention.context ?? null,
            confidence: mention.confidence,
            market_impact_likely: mention.marketImpactLikely ? 1 : 0,
            source_type: mention.sourceType,
            source_url: mention.sourceUrl,
            source_title: mention.sourceTitle ?? null,
            posted_at: mention.postedAt,
            price_at_mention: prices.priceAtMention,
            source_post_id: mention.sourcePostId + '_' + mention.ticker,
          })

          if (inserted) newMentions++
        }
      } catch (err) {
        errors.push(`Post ${post.id}: ${String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`Pipeline error: ${String(err)}`)
  }

  return { processed, newMentions, errors }
}
