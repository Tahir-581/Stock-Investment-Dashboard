import type { Holding, Investor, InvestorProfile, InvestorType } from './types'
import { isDatabaseConfigured, padCikDb, query, queryOne } from './db'

const AVATAR_COLORS = ['blue', 'teal', 'purple', 'amber', 'green', 'coral'] as const

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function avatarColorForCik(cik: string): string {
  const n = parseInt(cik.replace(/\D/g, ''), 10) || 0
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

type FilerRow = {
  cik: string
  name: string
  investor_type: string
  total_portfolio_value: string
  holdings_count: number
  last_filing_date: string | null
  top_ticker: string | null
  top_pct: string
}

function rowToInvestor(row: FilerRow): Investor {
  const type = row.investor_type
  return {
    cik: row.cik.replace(/^0+/, '') || row.cik,
    name: row.name,
    type: (type === 'unknown' ? 'hedge_fund' : type) as InvestorType,
    aum: Number(row.total_portfolio_value),
    holdingsCount: row.holdings_count,
    lastFilingDate: row.last_filing_date ?? '',
    ytdChange: 0,
    topTicker: row.top_ticker ?? '',
    topPct: Number(row.top_pct),
    avatarInitials: initialsFromName(row.name),
    avatarColor: avatarColorForCik(row.cik),
  }
}

export type HoldingsSummary = {
  totalValue: number
  holdingsCount: number
  top5Concentration: number
}

async function queryPeriodStats(
  cik: string,
  reportPeriod: string,
  options?: { q?: string; changesOnly?: boolean }
): Promise<HoldingsSummary & { topTicker: string; topPct: number }> {
  const conditions = ['cik = $1', 'report_period = $2::date']
  const queryParams: unknown[] = [cik, reportPeriod]
  let idx = 3

  const q = options?.q?.trim() ?? ''
  if (q) {
    conditions.push(
      `(name_of_issuer ILIKE $${idx} OR COALESCE(ticker, '') ILIKE $${idx} OR cusip ILIKE $${idx})`
    )
    queryParams.push(`%${q}%`)
    idx++
  }
  if (options?.changesOnly) {
    conditions.push('(is_new = true OR qoq_change_pct <> 0)')
  }

  const where = conditions.join(' AND ')

  const agg = await queryOne<{
    total_value: string
    holdings_count: string
    top_ticker: string | null
    top_pct: string
  }>(
    `SELECT COALESCE(SUM(value_usd), 0)::text AS total_value,
            COUNT(*)::text AS holdings_count,
            (SELECT COALESCE(ticker, LEFT(cusip, 6)) FROM holdings
             WHERE ${where} ORDER BY value_usd DESC LIMIT 1) AS top_ticker,
            (SELECT portfolio_pct::text FROM holdings
             WHERE ${where} ORDER BY portfolio_pct DESC LIMIT 1) AS top_pct
     FROM holdings WHERE ${where}`,
    queryParams
  )

  const top5 = await query<{ portfolio_pct: string }>(
    `SELECT portfolio_pct::text FROM holdings
     WHERE ${where}
     ORDER BY portfolio_pct DESC LIMIT 5`,
    queryParams
  )

  return {
    totalValue: Number(agg?.total_value ?? 0),
    holdingsCount: Number(agg?.holdings_count ?? 0),
    top5Concentration:
      Math.round(top5.reduce((s, r) => s + Number(r.portfolio_pct), 0) * 10) /
      10,
    topTicker: agg?.top_ticker ?? '',
    topPct: Number(agg?.top_pct ?? 0),
  }
}

function buildHoldingsOrderBy(
  sort: HoldingsQuery['sort'],
  order: 'asc' | 'desc'
): string {
  const dir = order === 'asc' ? 'ASC' : 'DESC'
  switch (sort) {
    case 'name':
      return `name_of_issuer ${dir}`
    case 'ticker':
      return `COALESCE(ticker, cusip) ${dir}`
    case 'pct':
      return `portfolio_pct ${dir}`
    case 'qoq':
      return `qoq_change_pct ${dir}`
    case 'shares':
      return `shares ${dir}`
    default:
      return `value_usd ${dir}`
  }
}

function rowToHolding(row: {
  ticker: string | null
  name_of_issuer: string
  cusip: string
  value_usd: string
  shares: string
  portfolio_pct: string
  qoq_change_pct: string
  is_new: boolean
}): Holding {
  const ticker =
    row.ticker?.trim() ||
    row.cusip?.slice(0, 6) ||
    row.name_of_issuer.slice(0, 6).toUpperCase()
  return {
    ticker,
    companyName: row.name_of_issuer,
    value: Number(row.value_usd),
    shares: Number(row.shares),
    portfolioPct: Number(row.portfolio_pct),
    qoqChange: Number(row.qoq_change_pct),
    isNew: row.is_new,
  }
}

export type InvestorsQuery = {
  q?: string
  type?: string
  sort?: 'aum' | 'name' | 'holdings' | 'filed'
  page?: number
  limit?: number
}

export type InvestorsResult = {
  investors: Investor[]
  total: number
  page: number
  limit: number
  totalAum: number
}

export async function queryInvestors(
  params: InvestorsQuery
): Promise<InvestorsResult | null> {
  if (!isDatabaseConfigured()) return null

  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 50))
  const offset = (page - 1) * limit
  const q = params.q?.trim() ?? ''
  const type = params.type && params.type !== 'all' ? params.type : null
  const sort = params.sort ?? 'aum'

  const orderBy =
    sort === 'name'
      ? 'name ASC'
      : sort === 'holdings'
        ? 'holdings_count DESC'
        : sort === 'filed'
          ? 'last_filing_date DESC NULLS LAST'
          : 'total_portfolio_value DESC'

  const conditions: string[] = []
  const queryParams: unknown[] = []
  let idx = 1

  if (q) {
    conditions.push(`search_vector @@ plainto_tsquery('english', $${idx++})`)
    queryParams.push(q)
  }
  if (type) {
    conditions.push(`investor_type = $${idx++}::investor_type`)
    queryParams.push(type)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM filers ${where}`,
    queryParams
  )
  const sumRow = await queryOne<{ sum: string }>(
    `SELECT COALESCE(SUM(total_portfolio_value), 0)::text AS sum FROM filers ${where}`,
    queryParams
  )

  const rows = await query<FilerRow>(
    `SELECT cik, name, investor_type, total_portfolio_value::text, holdings_count,
            last_filing_date::text, top_ticker, top_pct::text
     FROM filers ${where}
     ORDER BY ${orderBy}
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...queryParams, limit, offset]
  )

  return {
    investors: rows.map(rowToInvestor),
    total: Number(countRow?.count ?? 0),
    page,
    limit,
    totalAum: Number(sumRow?.sum ?? 0),
  }
}

export type InvestorProfileExtended = InvestorProfile & {
  reportPeriods?: string[]
  latestReportPeriod?: string
}

export async function queryInvestorProfile(
  cik: string
): Promise<InvestorProfileExtended | null> {
  if (!isDatabaseConfigured()) return null

  const padded = padCikDb(cik)

  const filer = await queryOne<FilerRow & { last_report_period: string | null }>(
    `SELECT cik, name, investor_type, total_portfolio_value::text, holdings_count,
            last_filing_date::text, last_report_period::text, top_ticker, top_pct::text
     FROM filers WHERE cik = $1`,
    [padded]
  )
  if (!filer) return null

  const periodRows = await query<{ report_period: string }>(
    `SELECT DISTINCT report_period::text
     FROM holdings WHERE cik = $1
     ORDER BY report_period DESC LIMIT 8`,
    [padded]
  )
  const latestPeriod =
    periodRows[0]?.report_period ?? filer.last_report_period ?? undefined

  let aum = Number(filer.total_portfolio_value)
  let holdingsCount = filer.holdings_count
  let topTicker = filer.top_ticker ?? ''
  let topPct = Number(filer.top_pct)
  let top5Concentration = 0

  if (latestPeriod) {
    const needsFallback =
      aum === 0 || holdingsCount === 0 || !topTicker
    if (needsFallback) {
      const stats = await queryPeriodStats(padded, latestPeriod)
      if (stats.totalValue > 0 || stats.holdingsCount > 0) {
        aum = stats.totalValue
        holdingsCount = stats.holdingsCount
        topTicker = stats.topTicker || topTicker
        topPct = stats.topPct || topPct
        top5Concentration = stats.top5Concentration
      }
    } else {
      const top5 = await query<{ portfolio_pct: string }>(
        `SELECT portfolio_pct::text FROM holdings
         WHERE cik = $1 AND report_period = $2::date
         ORDER BY portfolio_pct DESC LIMIT 5`,
        [padded, latestPeriod]
      )
      top5Concentration = top5.reduce((s, r) => s + Number(r.portfolio_pct), 0)
      top5Concentration = Math.round(top5Concentration * 10) / 10
    }
  }

  const base = rowToInvestor(filer)

  return {
    ...base,
    aum,
    holdingsCount,
    topTicker,
    topPct,
    holdings: [],
    totalHoldings: holdingsCount,
    top5Concentration,
    quarterlyTurnover: 0,
    description: `${base.name} · CIK ${base.cik} · 13F filer`,
    reportPeriods: periodRows.map((r) => r.report_period),
    latestReportPeriod: latestPeriod,
  }
}

export type HoldingsQuery = {
  cik: string
  period?: string
  page?: number
  limit?: number
  sort?: 'value' | 'name' | 'ticker' | 'pct' | 'qoq' | 'shares'
  order?: 'asc' | 'desc'
  q?: string
  changesOnly?: boolean
}

export type HoldingsResult = {
  holdings: Holding[]
  total: number
  page: number
  limit: number
  reportPeriod: string
  periods: string[]
  summary: HoldingsSummary
}

export async function queryHoldings(
  params: HoldingsQuery
): Promise<HoldingsResult | null> {
  if (!isDatabaseConfigured()) return null

  const padded = padCikDb(params.cik)
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(200, Math.max(1, params.limit ?? 50))
  const offset = (page - 1) * limit
  const q = params.q?.trim() ?? ''

  const periodRows = await query<{ report_period: string }>(
    `SELECT DISTINCT report_period::text FROM holdings
     WHERE cik = $1 ORDER BY report_period DESC`,
    [padded]
  )
  const periods = periodRows.map((r) => r.report_period)
  const reportPeriod =
    params.period && periods.includes(params.period)
      ? params.period
      : periods[0] ?? ''

  const emptySummary: HoldingsSummary = {
    totalValue: 0,
    holdingsCount: 0,
    top5Concentration: 0,
  }

  if (!reportPeriod) {
    return {
      holdings: [],
      total: 0,
      page,
      limit,
      reportPeriod: '',
      periods,
      summary: emptySummary,
    }
  }

  const order = params.order === 'asc' ? 'asc' : 'desc'
  const orderBy = buildHoldingsOrderBy(params.sort ?? 'value', order)

  const conditions = ['cik = $1', 'report_period = $2::date']
  const queryParams: unknown[] = [padded, reportPeriod]
  let idx = 3

  if (q) {
    conditions.push(
      `(name_of_issuer ILIKE $${idx} OR COALESCE(ticker, '') ILIKE $${idx} OR cusip ILIKE $${idx})`
    )
    queryParams.push(`%${q}%`)
    idx++
  }
  if (params.changesOnly) {
    conditions.push('(is_new = true OR qoq_change_pct <> 0)')
  }

  const where = conditions.join(' AND ')

  const periodStats = await queryPeriodStats(padded, reportPeriod, {
    q,
    changesOnly: params.changesOnly,
  })
  const summary: HoldingsSummary = {
    totalValue: periodStats.totalValue,
    holdingsCount: periodStats.holdingsCount,
    top5Concentration: periodStats.top5Concentration,
  }

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM holdings WHERE ${where}`,
    queryParams
  )

  const rows = await query<{
    ticker: string | null
    name_of_issuer: string
    cusip: string
    value_usd: string
    shares: string
    portfolio_pct: string
    qoq_change_pct: string
    is_new: boolean
  }>(
    `SELECT ticker, name_of_issuer, cusip, value_usd::text, shares::text,
            portfolio_pct::text, qoq_change_pct::text, is_new
     FROM holdings WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...queryParams, limit, offset]
  )

  return {
    holdings: rows.map(rowToHolding),
    total: Number(countRow?.count ?? 0),
    page,
    limit,
    reportPeriod,
    periods,
    summary,
  }
}

export async function queryFilerCikByName(
  name: string
): Promise<string | null> {
  if (!isDatabaseConfigured()) return null

  const exact = await queryOne<{ cik: string }>(
    `SELECT cik FROM filers WHERE name ILIKE $1
     ORDER BY total_portfolio_value DESC LIMIT 1`,
    [name]
  )
  if (exact) return exact.cik.replace(/^0+/, '') || exact.cik

  const fuzzy = await queryOne<{ cik: string }>(
    `SELECT cik FROM filers
     WHERE search_vector @@ plainto_tsquery('english', $1)
     ORDER BY total_portfolio_value DESC LIMIT 1`,
    [name.split(/\s+/).slice(0, 3).join(' ')]
  )
  return fuzzy?.cik.replace(/^0+/, '') ?? null
}

export async function queryInvestmentChanges(params: {
  action?: string
  sector?: string
  page?: number
  limit?: number
}) {
  if (!isDatabaseConfigured()) return null

  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 50))
  const offset = (page - 1) * limit

  const latest = await queryOne<{ report_period: string }>(
    `SELECT MAX(report_period)::text AS report_period FROM holdings`
  )
  const latestPeriod = latest?.report_period
  if (!latestPeriod) return { investments: [], total: 0, page, limit }

  let actionClause = ''
  if (params.action === 'new') {
    actionClause = 'AND h.is_new = true'
  } else if (params.action === 'increased') {
    actionClause = 'AND h.qoq_change_pct > 0 AND h.is_new = false'
  } else if (params.action === 'reduced') {
    actionClause = 'AND h.qoq_change_pct < 0'
  } else if (params.action === 'exited') {
    actionClause = 'AND false'
  }

  const baseWhere = `h.report_period = $1::date AND (h.is_new = true OR h.qoq_change_pct <> 0) ${actionClause}`

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM holdings h
     JOIN filers f ON f.cik = h.cik WHERE ${baseWhere}`,
    [latestPeriod]
  )

  const rows = await query<{
    cik: string
    investor_name: string
    investor_type: string
    ticker: string | null
    name_of_issuer: string
    value_usd: string
    shares: string
    portfolio_pct: string
    qoq_change_pct: string
    is_new: boolean
    last_filing_date: string | null
    accession_number: string
  }>(
    `SELECT h.cik, f.name AS investor_name, f.investor_type::text, h.ticker,
            h.name_of_issuer, h.value_usd::text, h.shares::text, h.portfolio_pct::text,
            h.qoq_change_pct::text, h.is_new, f.last_filing_date::text, h.accession_number
     FROM holdings h
     JOIN filers f ON f.cik = h.cik
     WHERE ${baseWhere}
     ORDER BY ABS(h.qoq_change_pct) DESC, h.value_usd DESC
     LIMIT $2 OFFSET $3`,
    [latestPeriod, limit, offset]
  )

  const { getSectorForTicker } = await import('./utils')

  const investments = rows
    .map((row, i) => {
      const ticker = row.ticker ?? row.name_of_issuer.slice(0, 6).toUpperCase()
      const sector = getSectorForTicker(ticker)
      if (params.sector && params.sector !== 'all' && sector !== params.sector) {
        return null
      }
      const action = row.is_new
        ? ('new' as const)
        : Number(row.qoq_change_pct) > 0
          ? ('increased' as const)
          : ('reduced' as const)
      return {
        id: `db-${row.accession_number}-${i}`,
        investorName: row.investor_name,
        investorCik: row.cik.replace(/^0+/, '') || row.cik,
        investorType: row.investor_type,
        formType: '13F' as const,
        ticker,
        companyName: row.name_of_issuer,
        filedAt: row.last_filing_date ?? latestPeriod,
        amount: Number(row.value_usd),
        shares: Number(row.shares),
        action,
        portfolioPct: Number(row.portfolio_pct),
        accessionNo: row.accession_number,
        avatarInitials: initialsFromName(row.investor_name),
        avatarColor: avatarColorForCik(row.cik),
        sector,
      }
    })
    .filter(Boolean)

  return {
    investments,
    total: Number(countRow?.count ?? 0),
    page,
    limit,
  }
}

export async function queryInsiders(params: {
  q?: string
  page?: number
  limit?: number
}) {
  if (!isDatabaseConfigured()) return null

  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 50))
  const offset = (page - 1) * limit
  const q = params.q?.trim() ?? ''

  if (q) {
    const countRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM insiders
       WHERE search_vector @@ plainto_tsquery('english', $1)`,
      [q]
    )
    const rows = await query(
      `SELECT * FROM insiders
       WHERE search_vector @@ plainto_tsquery('english', $1)
       ORDER BY filed_at DESC LIMIT $2 OFFSET $3`,
      [q, limit, offset]
    )
    return {
      insiders: rows,
      total: Number(countRow?.count ?? 0),
      page,
      limit,
    }
  }

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM insiders`
  )
  const rows = await query(
    `SELECT * FROM insiders ORDER BY filed_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
  return {
    insiders: rows,
    total: Number(countRow?.count ?? 0),
    page,
    limit,
  }
}

export async function hasFilerData(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM filers`
  )
  return Number(row?.count ?? 0) > 0
}
