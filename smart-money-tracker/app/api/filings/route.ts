import { NextResponse } from 'next/server'
import {
  computeDashboardStats,
  getRecentFilings,
  MOCK_FILINGS,
} from '@/lib/edgar'
import { API_CACHE_HEADERS } from '@/lib/api-cache'
import { queryFilerCikByName, hasFilerData } from '@/lib/filer-queries'
import type { FormType } from '@/lib/types'

function filterByForm(
  filings: typeof MOCK_FILINGS,
  form: string
): typeof MOCK_FILINGS {
  if (form === 'all') return filings
  if (form === '13D') {
    return filings.filter((f) => f.formType === '13D' || f.formType === '13G')
  }
  return filings.filter((f) => f.formType === (form as FormType))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const form = searchParams.get('form') ?? 'all'

  try {
    const formTypes: FormType[] | undefined =
      form === 'all'
        ? undefined
        : form === '13D'
          ? (['13D', '13G'] as FormType[])
          : ([form] as FormType[])

    let filings = await getRecentFilings(formTypes)
    const hasDb = await hasFilerData()

    if (hasDb) {
      filings = await Promise.all(
        filings.map(async (f) => {
          if (f.investorCik) return f
          const cik = await queryFilerCikByName(f.investorName)
          return cik ? { ...f, investorCik: cik } : f
        })
      )
    }

    const filtered = filterByForm(filings, form)
    const stats = computeDashboardStats(filtered)

    return NextResponse.json(
      { filings: filtered, stats },
      { status: 200, headers: API_CACHE_HEADERS }
    )
  } catch {
    const filtered = filterByForm(MOCK_FILINGS, form)
    const stats = computeDashboardStats(filtered)
    return NextResponse.json(
      { filings: filtered, stats },
      { status: 200, headers: API_CACHE_HEADERS }
    )
  }
}
