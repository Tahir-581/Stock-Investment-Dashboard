import { fetchCurrentPrice } from '@/lib/trump/priceEnricher'
import type { TrumpQuoteResponse } from '@/lib/trump/map-api'

export const dynamic = 'force-dynamic'

const CACHE_TTL_MS = 60_000
const quoteCache = new Map<
  string,
  { currentPrice: number | null; updatedAt: string }
>()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = (searchParams.get('ticker') ?? '').toUpperCase()

  if (!ticker) {
    return Response.json({ error: 'ticker is required' }, { status: 400 })
  }

  if (ticker === 'PRIVATE') {
    const body: TrumpQuoteResponse = {
      ticker,
      currentPrice: null,
      updatedAt: new Date().toISOString(),
    }
    return Response.json(body, { headers: { 'Cache-Control': 'no-store' } })
  }

  const cached = quoteCache.get(ticker)
  if (cached && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
    return Response.json(
      { ticker, ...cached } satisfies TrumpQuoteResponse,
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const currentPrice = await fetchCurrentPrice(ticker)
    const updatedAt = new Date().toISOString()
    quoteCache.set(ticker, { currentPrice, updatedAt })

    const body: TrumpQuoteResponse = {
      ticker,
      currentPrice,
      updatedAt,
    }
    return Response.json(body, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return Response.json(
      {
        ticker,
        currentPrice: null,
        updatedAt: new Date().toISOString(),
        error: String(err),
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
