import { NextResponse } from 'next/server'
import {
  filingsToInvestments,
  getRecentFilings,
  MOCK_INVESTMENTS,
} from '@/lib/edgar'
import { API_CACHE_HEADERS } from '@/lib/api-cache'
import { queryInvestmentChanges, hasFilerData } from '@/lib/filer-queries'
import type { ActionType, InvestmentRow } from '@/lib/types'

function filterInvestments(
  rows: InvestmentRow[],
  action: string,
  sector: string
): InvestmentRow[] {
  let result = rows
  if (action !== 'all') {
    result = result.filter((r) => r.action === (action as ActionType))
  }
  if (sector !== 'all') {
    result = result.filter((r) => r.sector === sector)
  }
  return result
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') ?? 'all'
  const sector = searchParams.get('sector') ?? 'all'
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 100)

  try {
    const hasDb = await hasFilerData()
    if (hasDb) {
      const dbResult = await queryInvestmentChanges({ action, sector, page, limit })
      if (dbResult) {
        return NextResponse.json(
          {
            investments: dbResult.investments,
            total: dbResult.total,
            page: dbResult.page,
            limit: dbResult.limit,
          },
          { status: 200, headers: API_CACHE_HEADERS }
        )
      }
    }

    const filings = await getRecentFilings()
    const fromFilings = filingsToInvestments(filings)
    const rows =
      fromFilings.length > 0 ? fromFilings : MOCK_INVESTMENTS
    const filtered = filterInvestments(rows, action, sector)

    return NextResponse.json(
      { investments: filtered, total: filtered.length, page: 1, limit: filtered.length },
      { status: 200, headers: API_CACHE_HEADERS }
    )
  } catch {
    const filtered = filterInvestments(MOCK_INVESTMENTS, action, sector)
    return NextResponse.json(
      { investments: filtered, total: filtered.length, page: 1, limit: filtered.length },
      { status: 200, headers: API_CACHE_HEADERS }
    )
  }
}
