import { queryStats } from '@/lib/trump/db'
import { MOCK_TRUMP_STATS } from '@/lib/trump/mockData'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stats = queryStats()
    const hasData = (stats.totalMentions as number) > 0
    const result = hasData ? stats : MOCK_TRUMP_STATS
    return Response.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(MOCK_TRUMP_STATS)
  }
}
