import { NextResponse } from 'next/server'
import {
  buildInvestorProfile,
  MOCK_INVESTOR_PROFILES,
  padCik,
} from '@/lib/edgar'
import { API_CACHE_HEADERS, API_NO_STORE_HEADERS } from '@/lib/api-cache'
import { queryInvestorProfile, hasFilerData } from '@/lib/filer-queries'

export async function GET(
  _request: Request,
  { params }: { params: { cik: string } }
) {
  const padded = padCik(params.cik)

  try {
    const hasDb = await hasFilerData()
    if (hasDb) {
      const dbProfile = await queryInvestorProfile(params.cik)
      if (dbProfile) {
        return NextResponse.json(dbProfile, {
          status: 200,
          headers: API_CACHE_HEADERS,
        })
      }
    }

    const profile = await buildInvestorProfile(params.cik)
    if (profile.holdings.length > 0 || profile.aum > 0) {
      return NextResponse.json(profile, {
        status: 200,
        headers: API_CACHE_HEADERS,
      })
    }
  } catch {
    /* try mock */
  }

  const mock = MOCK_INVESTOR_PROFILES[padded]
  if (mock) {
    return NextResponse.json(mock, {
      status: 200,
      headers: API_CACHE_HEADERS,
    })
  }

  return NextResponse.json(
    { error: 'Investor not found' },
    { status: 404, headers: API_NO_STORE_HEADERS }
  )
}
