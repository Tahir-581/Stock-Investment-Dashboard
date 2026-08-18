import { queryMentions } from '@/lib/trump/db'
import { MOCK_TRUMP_MENTIONS } from '@/lib/trump/mockData'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  try {
    const data = queryMentions({
      sentiment: searchParams.get('sentiment') || undefined,
      source_type: searchParams.get('source_type') || undefined,
      ticker: searchParams.get('ticker') || undefined,
      days: searchParams.get('days') ? Number(searchParams.get('days')) : 7,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : 0,
    })
    const result = data.length > 0 ? data : MOCK_TRUMP_MENTIONS
    return Response.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(MOCK_TRUMP_MENTIONS)
  }
}
