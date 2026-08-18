import { NextResponse } from 'next/server'
import { queryInsiders } from '@/lib/filer-queries'
import { API_CACHE_HEADERS } from '@/lib/api-cache'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? undefined
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 50)

  try {
    const result = await queryInsiders({ q, page, limit })
    if (result) {
      return NextResponse.json(result, {
        status: 200,
        headers: API_CACHE_HEADERS,
      })
    }

    return NextResponse.json(
      { insiders: [], total: 0, page, limit },
      { status: 200, headers: API_CACHE_HEADERS }
    )
  } catch {
    return NextResponse.json(
      { insiders: [], total: 0, page, limit },
      { status: 200, headers: API_CACHE_HEADERS }
    )
  }
}
