import nlp from 'compromise'
import Sentiment from 'sentiment'
import { TICKER_DICTIONARY, ALIAS_LOOKUP, lookupCompany } from './tickerDictionary'
import type { RawSourcePost, TrumpMention, TrumpSentiment } from '../types'

const sentimentAnalyzer = new Sentiment()

const TRUMP_POSITIVE = [
  'great',
  'beautiful',
  'tremendous',
  'fantastic',
  'wonderful',
  'incredible',
  'best',
  'winning',
  'strong',
  'powerful',
  'successful',
  'genius',
  'smart',
  'perfect',
  'terrific',
  'amazing',
  'outstanding',
  'excellent',
  'massive',
  'huge',
  'record',
  'love',
  'like',
]
const TRUMP_NEGATIVE = [
  'terrible',
  'horrible',
  'disaster',
  'failing',
  'weak',
  'sad',
  'bad',
  'worst',
  'corrupt',
  'disgrace',
  'embarrassing',
  'incompetent',
  'fake',
  'rigged',
  'failed',
  'losing',
  'stupid',
  'dumb',
  'overrated',
  'loser',
  'clown',
  'sleepy',
  'crooked',
]

interface ExtractedMention {
  ticker: string
  company: string
  sector: string
  sentiment: TrumpSentiment
  mentionType: string
  trumpQuote: string
  context: string
  confidence: number
  marketImpactLikely: boolean
}

export function extractMentionsFromText(
  text: string,
  post: RawSourcePost
): Omit<
  TrumpMention,
  | 'id'
  | 'createdAt'
  | 'priceAtMention'
  | 'price1hAfter'
  | 'price24hAfter'
  | 'pctMove1h'
  | 'pctMove24h'
>[] {
  const results: ExtractedMention[] = []
  const foundTickers = new Set<string>()
  const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  const tickerRegex = /\$([A-Z]{1,5})\b|\b(NYSE|NASDAQ|AMEX):\s*([A-Z]{1,5})\b/g
  let match: RegExpExecArray | null
  while ((match = tickerRegex.exec(cleanText)) !== null) {
    const rawTicker = (match[1] || match[3]).toUpperCase()
    const entry = Object.values(TICKER_DICTIONARY).find((e) => e.ticker === rawTicker)
    if (entry && !foundTickers.has(rawTicker)) {
      foundTickers.add(rawTicker)
      const quote = extractSurroundingQuote(cleanText, match[0], 150)
      const sentiment = analyzeSentiment(quote)
      results.push({
        ticker: rawTicker,
        company: entry.company,
        sector: entry.sector,
        sentiment,
        mentionType: classifyMentionType(quote),
        trumpQuote: quote,
        context: `Trump mentioned ${entry.company} (${rawTicker})`,
        confidence: 0.97,
        marketImpactLikely: isMarketMoving(quote, sentiment),
      })
    }
  }

  const lowerText = cleanText.toLowerCase()
  for (const [alias, dictKey] of Object.entries(ALIAS_LOOKUP)) {
    if (alias.length < 4) continue

    const idx = lowerText.indexOf(alias)
    if (idx === -1) continue

    const entry = TICKER_DICTIONARY[dictKey]
    if (!entry || foundTickers.has(entry.ticker)) continue

    const before = lowerText.slice(Math.max(0, idx - 20), idx)
    if (/\bnot\b|\bno\b|\bnever\b/.test(before)) continue

    foundTickers.add(entry.ticker)
    const quote = extractSurroundingQuote(
      cleanText,
      cleanText.slice(idx, idx + alias.length),
      150
    )
    const sentiment = analyzeSentiment(quote)

    const confidence =
      alias.length >= 8 ? 0.92 : alias.length >= 6 ? 0.85 : 0.78

    results.push({
      ticker: entry.ticker,
      company: entry.company,
      sector: entry.sector,
      sentiment,
      mentionType: classifyMentionType(quote),
      trumpQuote: quote,
      context: buildContext(alias, entry.company, sentiment),
      confidence,
      marketImpactLikely: isMarketMoving(quote, sentiment),
    })
  }

  const doc = nlp(cleanText)
  const organizations = doc.organizations().out('array') as string[]
  for (const org of organizations) {
    const entry = lookupCompany(org)
    if (entry && !foundTickers.has(entry.ticker)) {
      foundTickers.add(entry.ticker)
      const quote = extractSurroundingQuote(cleanText, org, 150)
      const sentiment = analyzeSentiment(quote)
      results.push({
        ticker: entry.ticker,
        company: entry.company,
        sector: entry.sector,
        sentiment,
        mentionType: classifyMentionType(quote),
        trumpQuote: quote,
        context: buildContext(org, entry.company, sentiment),
        confidence: 0.8,
        marketImpactLikely: isMarketMoving(quote, sentiment),
      })
    }
  }

  const filtered = results.filter((r) => r.confidence >= 0.75)

  return filtered.map((r) => ({
    ticker: r.ticker,
    companyName: r.company,
    sector: r.sector,
    sentiment: r.sentiment,
    mentionType: r.mentionType as TrumpMention['mentionType'],
    trumpQuote: r.trumpQuote,
    context: r.context,
    confidence: r.confidence,
    marketImpactLikely: r.marketImpactLikely,
    sourceType: post.sourceType,
    sourceUrl: post.url,
    sourceTitle: post.title,
    postedAt: post.publishedAt,
    sourcePostId: post.id,
  }))
}

function extractSurroundingQuote(text: string, keyword: string, radius: number): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return text.slice(0, 200)
  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + keyword.length + radius)
  let quote = text.slice(start, end).trim()
  if (start > 0) quote = '...' + quote
  if (end < text.length) quote = quote + '...'
  return quote
}

function analyzeSentiment(text: string): TrumpSentiment {
  const lower = text.toLowerCase()
  const hasPositive = TRUMP_POSITIVE.some((w) => lower.includes(w))
  const hasNegative = TRUMP_NEGATIVE.some((w) => lower.includes(w))

  if (hasPositive && hasNegative) return 'mixed'
  if (hasPositive) return 'positive'
  if (hasNegative) return 'negative'

  const result = sentimentAnalyzer.analyze(text)
  if (result.score > 2) return 'positive'
  if (result.score < -2) return 'negative'
  return 'neutral'
}

function classifyMentionType(text: string): string {
  const lower = text.toLowerCase()
  if (/invest|billion|trillion|factory|jobs|build|bring back/.test(lower))
    return 'investment_announcement'
  if (/tariff|tax|regulation|policy|deal|trade/.test(lower)) return 'policy_related'
  if (/great|best|love|fantastic|tremendous|beautiful/.test(lower))
    return 'direct_praise'
  if (/terrible|disaster|horrible|failing|corrupt|rigged/.test(lower))
    return 'direct_criticism'
  return 'indirect'
}

function isMarketMoving(text: string, sentiment: string): boolean {
  const lower = text.toLowerCase()
  if (/billion|trillion|tariff|ban|sanction|deal|agreement|invest/.test(lower))
    return true
  if (sentiment === 'positive' || sentiment === 'negative') {
    if (/\b(will|going to|plan|announce|sign)\b/.test(lower)) return true
  }
  return false
}

function buildContext(mention: string, company: string, sentiment: string): string {
  const tone =
    sentiment === 'positive'
      ? 'positively'
      : sentiment === 'negative'
        ? 'negatively'
        : 'neutrally'
  return `Trump referenced ${company} ${tone} in this statement`
}
