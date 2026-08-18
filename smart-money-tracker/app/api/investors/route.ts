import { NextResponse } from 'next/server'
import { MOCK_INVESTORS } from '@/lib/edgar'
import { API_CACHE_HEADERS } from '@/lib/api-cache'
import { queryInvestors, hasFilerData } from '@/lib/filer-queries'
import type { Investor, InvestorType } from '@/lib/types'

function filterByType(investors: Investor[], type: string): Investor[] {
  if (type === 'all') return investors
  return investors.filter((i) => i.type === (type as InvestorType))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'all'
  const q = searchParams.get('q') ?? undefined
  const sort = (searchParams.get('sort') ?? 'aum') as
    | 'aum'
    | 'name'
    | 'holdings'
    | 'filed'
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 50)

  try {
    const hasDb = await hasFilerData()
    if (hasDb) {
      const result = await queryInvestors({ q, type, sort, page, limit })
      if (result) {
        return NextResponse.json(result, {
          status: 200,
          headers: API_CACHE_HEADERS,
        })
      }
    }

    const investors = filterByType(MOCK_INVESTORS, type)
    const filtered = q
      ? investors.filter((i) =>
          i.name.toLowerCase().includes(q.toLowerCase())
        )
      : investors

    return NextResponse.json(
      {
        investors: filtered,
        total: filtered.length,
        page: 1,
        limit: filtered.length,
        totalAum: filtered.reduce((s, i) => s + i.aum, 0),
      },
      { status: 200, headers: API_CACHE_HEADERS }
    )
  } catch {
    const filtered = filterByType(MOCK_INVESTORS, type)
    return NextResponse.json(
      {
        investors: filtered,
        total: filtered.length,
        page: 1,
        limit: filtered.length,
        totalAum: filtered.reduce((s, i) => s + i.aum, 0),
      },
      { status: 200, headers: API_CACHE_HEADERS }
    )
  }
}
