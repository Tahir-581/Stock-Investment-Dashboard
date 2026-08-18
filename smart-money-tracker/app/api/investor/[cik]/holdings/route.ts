import { NextResponse } from 'next/server'
import { API_CACHE_HEADERS, API_NO_STORE_HEADERS } from '@/lib/api-cache'
import { queryHoldings, hasFilerData } from '@/lib/filer-queries'
import { buildInvestorProfile } from '@/lib/edgar'

export async function GET(
  request: Request,
  { params }: { params: { cik: string } }
) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? undefined
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 50)
  const sort = (searchParams.get('sort') ?? 'value') as
    | 'value'
    | 'name'
    | 'ticker'
    | 'pct'
    | 'qoq'
    | 'shares'
  const order = (searchParams.get('order') ?? 'desc') as 'asc' | 'desc'
  const q = searchParams.get('q') ?? undefined
  const changesOnly = searchParams.get('changes') === 'true'

  try {
    const hasDb = await hasFilerData()
    if (hasDb) {
      const result = await queryHoldings({
        cik: params.cik,
        period,
        page,
        limit,
        sort,
        order,
        q,
        changesOnly,
      })
      if (result) {
        return NextResponse.json(result, {
          status: 200,
          headers: API_CACHE_HEADERS,
        })
      }
    }

    const profile = await buildInvestorProfile(params.cik)
    let holdings = profile.holdings
    if (changesOnly) {
      holdings = holdings.filter((h) => h.isNew || h.qoqChange !== 0)
    }
    if (q) {
      const lower = q.toLowerCase()
      holdings = holdings.filter(
        (h) =>
          h.companyName.toLowerCase().includes(lower) ||
          h.ticker.toLowerCase().includes(lower)
      )
    }
    const sortKey = sort
    const sortDir = order === 'asc' ? 1 : -1
    holdings = [...holdings].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = a.companyName.localeCompare(b.companyName)
          break
        case 'ticker':
          cmp = a.ticker.localeCompare(b.ticker)
          break
        case 'pct':
          cmp = a.portfolioPct - b.portfolioPct
          break
        case 'qoq':
          cmp = a.qoqChange - b.qoqChange
          break
        case 'shares':
          cmp = a.shares - b.shares
          break
        default:
          cmp = a.value - b.value
      }
      return cmp * sortDir
    })

    const totalValue = holdings.reduce((s, h) => s + h.value, 0)
    const top5Concentration =
      Math.round(
        [...holdings]
          .sort((a, b) => b.portfolioPct - a.portfolioPct)
          .slice(0, 5)
          .reduce((s, h) => s + h.portfolioPct, 0) * 10
      ) / 10

    const offset = (page - 1) * limit
    const paged = holdings.slice(offset, offset + limit)

    return NextResponse.json(
      {
        holdings: paged,
        total: holdings.length,
        page,
        limit,
        reportPeriod: profile.latestReportPeriod ?? '',
        periods: profile.reportPeriods ?? [],
        summary: {
          totalValue,
          holdingsCount: holdings.length,
          top5Concentration,
        },
      },
      { status: 200, headers: API_CACHE_HEADERS }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to load holdings' },
      { status: 500, headers: API_NO_STORE_HEADERS }
    )
  }
}
