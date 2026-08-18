import Parser from 'rss-parser'
import type { RawSourcePost } from '../types'

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'SmartMoneyTracker/1.0 (news aggregator)' },
})

export async function fetchTruthSocialPosts(): Promise<RawSourcePost[]> {
  const RSS_URL = 'https://truthsocial.com/@realDonaldTrump.rss'

  try {
    const feed = await parser.parseURL(RSS_URL)
    return feed.items.slice(0, 15).map((item) => ({
      id: item.guid || item.link || String(Date.now()),
      text: stripHtml(item.content || item.contentSnippet || item.title || ''),
      url: item.link || RSS_URL,
      title: 'Truth Social — @realDonaldTrump',
      publishedAt: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      sourceType: 'truth_social' as const,
    }))
  } catch (err) {
    console.warn('Truth Social RSS failed:', err)
    return MOCK_TRUTH_SOCIAL
  }
}

export async function fetchWhiteHouseRemarks(): Promise<RawSourcePost[]> {
  try {
    const feed = await parser.parseURL('https://www.whitehouse.gov/remarks/feed/')
    return feed.items.slice(0, 8).map((item) => ({
      id: item.guid || item.link || '',
      text: stripHtml(item.contentSnippet || item.title || ''),
      url: item.link || 'https://www.whitehouse.gov/remarks/',
      title: item.title || 'White House Remarks',
      publishedAt: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      sourceType: 'whitehouse_remarks' as const,
    }))
  } catch {
    return MOCK_WHITEHOUSE
  }
}

export async function fetchReutersNews(): Promise<RawSourcePost[]> {
  const feeds = [
    'https://feeds.reuters.com/reuters/businessNews',
    'https://feeds.reuters.com/Reuters/domesticNews',
    'https://feeds.reuters.com/reuters/topNews',
  ]

  const results: RawSourcePost[] = []

  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url)
      const trumpItems = feed.items.filter((item) => {
        const text = (item.title || '') + ' ' + (item.contentSnippet || '')
        return /trump/i.test(text)
      })
      for (const item of trumpItems.slice(0, 5)) {
        results.push({
          id: item.guid || item.link || String(Math.random()),
          text: stripHtml((item.title || '') + '. ' + (item.contentSnippet || '')),
          url: item.link || url,
          title: item.title || 'Reuters News',
          publishedAt: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString(),
          sourceType: 'reuters_ap' as const,
        })
      }
    } catch {
      // Continue to next feed
    }
  }

  return results.length > 0 ? results : MOCK_REUTERS
}

export async function fetchYahooFinanceNews(): Promise<RawSourcePost[]> {
  const feeds = [
    'https://finance.yahoo.com/news/rssindex',
    'https://finance.yahoo.com/rss/topstories',
  ]

  const results: RawSourcePost[] = []
  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url)
      const trumpItems = feed.items.filter((item) =>
        /trump/i.test((item.title || '') + ' ' + (item.contentSnippet || ''))
      )
      for (const item of trumpItems.slice(0, 5)) {
        results.push({
          id: item.guid || item.link || String(Math.random()),
          text: stripHtml((item.title || '') + '. ' + (item.contentSnippet || '')),
          url: item.link || url,
          title: item.title || 'Yahoo Finance',
          publishedAt: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString(),
          sourceType: 'financial_news' as const,
        })
      }
    } catch {
      // Continue
    }
  }
  return results
}

export async function fetchMarketWatchNews(): Promise<RawSourcePost[]> {
  try {
    const feed = await parser.parseURL(
      'https://feeds.marketwatch.com/marketwatch/topstories/'
    )
    const trumpItems = feed.items.filter((item) =>
      /trump/i.test((item.title || '') + ' ' + (item.contentSnippet || ''))
    )
    return trumpItems.slice(0, 5).map((item) => ({
      id: item.guid || item.link || String(Math.random()),
      text: stripHtml((item.title || '') + '. ' + (item.contentSnippet || '')),
      url: item.link || '',
      title: item.title || 'MarketWatch',
      publishedAt: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      sourceType: 'financial_news' as const,
    }))
  } catch {
    return []
  }
}

export async function fetchAllSources(): Promise<RawSourcePost[]> {
  const [truthSocial, whitehouse, reuters, yahoo, marketwatch] =
    await Promise.allSettled([
      fetchTruthSocialPosts(),
      fetchWhiteHouseRemarks(),
      fetchReutersNews(),
      fetchYahooFinanceNews(),
      fetchMarketWatchNews(),
    ])

  const all: RawSourcePost[] = [
    ...(truthSocial.status === 'fulfilled' ? truthSocial.value : []),
    ...(whitehouse.status === 'fulfilled' ? whitehouse.value : []),
    ...(reuters.status === 'fulfilled' ? reuters.value : []),
    ...(yahoo.status === 'fulfilled' ? yahoo.value : []),
    ...(marketwatch.status === 'fulfilled' ? marketwatch.value : []),
  ]

  const seen = new Set<string>()
  return all
    .filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

const MOCK_TRUTH_SOCIAL: RawSourcePost[] = [
  {
    id: 'mock_ts_1',
    text: 'Just spoke with Tim Cook of Apple. They are investing 500 BILLION DOLLARS in America. Great company, great leader!',
    url: 'https://truthsocial.com/@realDonaldTrump/mock1',
    title: 'Truth Social — @realDonaldTrump',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    sourceType: 'truth_social',
  },
  {
    id: 'mock_ts_2',
    text: 'Boeing is making terrible planes. Unsafe. We are looking into it very seriously. Sad!',
    url: 'https://truthsocial.com/@realDonaldTrump/mock2',
    title: 'Truth Social — @realDonaldTrump',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    sourceType: 'truth_social',
  },
  {
    id: 'mock_ts_3',
    text: 'American Steel is coming back STRONG. We will protect our steel industry with tariffs. US Steel will be great again!',
    url: 'https://truthsocial.com/@realDonaldTrump/mock3',
    title: 'Truth Social — @realDonaldTrump',
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    sourceType: 'truth_social',
  },
]

const MOCK_WHITEHOUSE: RawSourcePost[] = [
  {
    id: 'mock_wh_1',
    text: 'Remarks by President Trump at the signing of the American Investment Act. Ford Motor Company announced 8 billion dollar investment in Michigan manufacturing plants.',
    url: 'https://www.whitehouse.gov/remarks/mock1',
    title: 'Remarks — White House',
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    sourceType: 'whitehouse_remarks',
  },
]

const MOCK_REUTERS: RawSourcePost[] = [
  {
    id: 'mock_rt_1',
    text: 'Trump says Nvidia chips critical to US AI dominance, calls Jensen Huang a great American businessman.',
    url: 'https://reuters.com/mock1',
    title: 'Reuters — Trump praises Nvidia',
    publishedAt: new Date(Date.now() - 43200000).toISOString(),
    sourceType: 'reuters_ap',
  },
]
