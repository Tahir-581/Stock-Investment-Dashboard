import { queryWatchlist } from '@/lib/trump/db'
import { MOCK_WATCHLIST } from '@/lib/trump/mockData'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = queryWatchlist()
    const result = data.length > 0 ? data : MOCK_WATCHLIST
    return Response.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(MOCK_WATCHLIST)
  }
}
