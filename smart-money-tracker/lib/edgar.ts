import type {
  DashboardStats,
  Filing,
  FormType,
  Holding,
  Investor,
  InvestorProfile,
  InvestmentRow,
} from './types'
import { getSectorForTicker } from './utils'

export const USER_AGENT = 'SmartMoneyTracker contact@smartmoneytracker.com'

export const MOCK_FILINGS: Filing[] = [
  {
    id: 'filing-nvda-huang',
    investorName: 'Jensen Huang',
    investorCik: '',
    investorType: 'individual',
    formType: '4',
    ticker: 'NVDA',
    companyName: 'NVIDIA Corp',
    filedAt: new Date().toISOString(),
    transactionDate: '2026-06-02',
    amount: 48_200_000,
    shares: 430_000,
    avgPrice: 112.09,
    action: 'buy',
    accessionNo: 'mock-nvda-4',
    avatarInitials: 'JH',
    avatarColor: 'green',
  },
  {
    id: 'filing-hon-elliott',
    investorName: 'Elliott Management',
    investorCik: '1048268',
    investorType: 'pe_activist',
    formType: '13D',
    ticker: 'HON',
    companyName: 'Honeywell International',
    filedAt: new Date(Date.now() - 14 * 60_000).toISOString(),
    amount: 1_200_000_000,
    action: 'increased',
    portfolioPct: 8.3,
    accessionNo: 'mock-hon-13d',
    avatarInitials: 'EM',
    avatarColor: 'blue',
  },
  {
    id: 'filing-bridgewater-13f',
    investorName: 'Bridgewater Associates',
    investorCik: '1350694',
    investorType: 'hedge_fund',
    formType: '13F',
    filedAt: new Date().toISOString(),
    aum: 27_400_000_000,
    accessionNo: 'mock-bw-13f',
    avatarInitials: 'BW',
    avatarColor: 'teal',
  },
  {
    id: 'filing-aapl-cook',
    investorName: 'Tim Cook',
    investorCik: '',
    investorType: 'individual',
    formType: '4',
    ticker: 'AAPL',
    companyName: 'Apple Inc',
    filedAt: new Date(Date.now() - 3600_000).toISOString(),
    transactionDate: '2026-06-01',
    amount: -96_300_000,
    shares: 511_000,
    avgPrice: 188.45,
    action: 'sell',
    accessionNo: 'mock-aapl-4',
    avatarInitials: 'TC',
    avatarColor: 'coral',
  },
  {
    id: 'filing-berkshire-13f',
    investorName: 'Berkshire Hathaway',
    investorCik: '1067983',
    investorType: 'value_fund',
    formType: '13F',
    filedAt: new Date(Date.now() - 7200_000).toISOString(),
    aum: 380_000_000_000,
    accessionNo: 'mock-bh-13f',
    avatarInitials: 'BH',
    avatarColor: 'amber',
  },
  {
    id: 'filing-meta-zuck',
    investorName: 'Mark Zuckerberg',
    investorCik: '',
    investorType: 'individual',
    formType: '4',
    ticker: 'META',
    companyName: 'Meta Platforms',
    filedAt: new Date(Date.now() - 10_800_000).toISOString(),
    transactionDate: '2026-06-01',
    amount: -210_500_000,
    action: 'sell',
    accessionNo: 'mock-meta-4',
    avatarInitials: 'MZ',
    avatarColor: 'coral',
  },
  {
    id: 'filing-tiger-13f',
    investorName: 'Tiger Global Management',
    investorCik: '1167483',
    investorType: 'hedge_fund',
    formType: '13F',
    filedAt: new Date(Date.now() - 14_400_000).toISOString(),
    aum: 14_100_000_000,
    accessionNo: 'mock-tg-13f',
    avatarInitials: 'TG',
    avatarColor: 'purple',
  },
]

export const MOCK_INVESTORS: Investor[] = [
  {
    cik: '1067983',
    name: 'Berkshire Hathaway',
    type: 'value_fund',
    aum: 380_100_000_000,
    holdingsCount: 47,
    lastFilingDate: '2026-05-15',
    ytdChange: 8.3,
    topTicker: 'AAPL',
    topPct: 22.6,
    avatarInitials: 'BH',
    avatarColor: 'amber',
  },
  {
    cik: '1350694',
    name: 'Bridgewater Associates',
    type: 'hedge_fund',
    aum: 27_400_000_000,
    holdingsCount: 1040,
    lastFilingDate: '2026-05-15',
    ytdChange: 2.1,
    topTicker: 'SPY',
    topPct: 11.4,
    avatarInitials: 'BW',
    avatarColor: 'teal',
  },
  {
    cik: '1048268',
    name: 'Elliott Management',
    type: 'pe_activist',
    aum: 65_200_000_000,
    holdingsCount: 23,
    lastFilingDate: '2026-06-02',
    ytdChange: 14.7,
    topTicker: 'HON',
    topPct: 8.3,
    avatarInitials: 'EM',
    avatarColor: 'blue',
  },
  {
    cik: '1167483',
    name: 'Tiger Global Management',
    type: 'hedge_fund',
    aum: 14_100_000_000,
    holdingsCount: 138,
    lastFilingDate: '2026-05-15',
    ytdChange: -3.2,
    topTicker: 'META',
    topPct: 9.1,
    avatarInitials: 'TG',
    avatarColor: 'purple',
  },
  {
    cik: '1536411',
    name: 'Stanley Druckenmiller',
    type: 'individual',
    aum: 2_900_000_000,
    holdingsCount: 31,
    lastFilingDate: '2026-05-15',
    ytdChange: -1.4,
    topTicker: 'NVDA',
    topPct: 17.2,
    avatarInitials: 'SD',
    avatarColor: 'green',
  },
]

const BERKSHIRE_HOLDINGS: Holding[] = [
  {
    ticker: 'AAPL',
    companyName: 'Apple Inc',
    value: 86_000_000_000,
    shares: 400_000_000,
    portfolioPct: 22.6,
    qoqChange: -3.1,
    isNew: false,
  },
  {
    ticker: 'AXP',
    companyName: 'American Express',
    value: 77_900_000_000,
    shares: 151_000_000,
    portfolioPct: 20.5,
    qoqChange: 0.4,
    isNew: false,
  },
  {
    ticker: 'BAC',
    companyName: 'Bank of America',
    value: 39_600_000_000,
    shares: 1_030_000_000,
    portfolioPct: 10.4,
    qoqChange: 0,
    isNew: false,
  },
  {
    ticker: 'KO',
    companyName: 'Coca-Cola',
    value: 38_800_000_000,
    shares: 400_000_000,
    portfolioPct: 10.2,
    qoqChange: 0,
    isNew: false,
  },
  {
    ticker: 'CVX',
    companyName: 'Chevron',
    value: 27_400_000_000,
    shares: 118_000_000,
    portfolioPct: 7.2,
    qoqChange: -1.2,
    isNew: false,
  },
  {
    ticker: 'OXY',
    companyName: 'Occidental Petroleum',
    value: 13_900_000_000,
    shares: 255_000_000,
    portfolioPct: 3.7,
    qoqChange: 0.9,
    isNew: false,
  },
  {
    ticker: 'TSM',
    companyName: 'Taiwan Semiconductor',
    value: 4_800_000_000,
    shares: 41_000_000,
    portfolioPct: 1.3,
    qoqChange: 100,
    isNew: true,
  },
]

export const MOCK_INVESTOR_PROFILES: Record<string, InvestorProfile> = {
  '0001067983': {
    cik: '1067983',
    name: 'Berkshire Hathaway',
    type: 'value_fund',
    aum: 380_100_000_000,
    holdingsCount: 47,
    lastFilingDate: '2026-05-15',
    ytdChange: 8.3,
    topTicker: 'AAPL',
    topPct: 22.6,
    avatarInitials: 'BH',
    avatarColor: 'amber',
    holdings: BERKSHIRE_HOLDINGS,
    totalHoldings: 47,
    top5Concentration: 71,
    quarterlyTurnover: 2.1,
    description:
      'Value fund · Warren Buffett · CIK 1067983 · 13F filer since 1994',
  },
  '0001048268': {
    cik: '1048268',
    name: 'Elliott Management',
    type: 'pe_activist',
    aum: 65_200_000_000,
    holdingsCount: 23,
    lastFilingDate: '2026-06-02',
    ytdChange: 14.7,
    topTicker: 'HON',
    topPct: 8.3,
    avatarInitials: 'EM',
    avatarColor: 'blue',
    holdings: [
      {
        ticker: 'HON',
        companyName: 'Honeywell International',
        value: 5_400_000_000,
        shares: 5_300_000,
        portfolioPct: 8.3,
        qoqChange: 100,
        isNew: true,
      },
    ],
    totalHoldings: 23,
    top5Concentration: 45,
    quarterlyTurnover: 12.4,
    description: 'Activist PE · Paul Singer · CIK 1048268',
  },
  '0001350694': {
    cik: '1350694',
    name: 'Bridgewater Associates',
    type: 'hedge_fund',
    aum: 27_400_000_000,
    holdingsCount: 1040,
    lastFilingDate: '2026-05-15',
    ytdChange: 2.1,
    topTicker: 'SPY',
    topPct: 11.4,
    avatarInitials: 'BW',
    avatarColor: 'teal',
    holdings: [
      {
        ticker: 'SPY',
        companyName: 'SPDR S&P 500 ETF',
        value: 3_100_000_000,
        shares: 1_400_000,
        portfolioPct: 11.4,
        qoqChange: 4.2,
        isNew: false,
      },
    ],
    totalHoldings: 1040,
    top5Concentration: 28,
    quarterlyTurnover: 8.5,
    description: 'Macro hedge fund · Ray Dalio legacy · CIK 1350694',
  },
  '0001167483': {
    cik: '1167483',
    name: 'Tiger Global Management',
    type: 'hedge_fund',
    aum: 14_100_000_000,
    holdingsCount: 138,
    lastFilingDate: '2026-05-15',
    ytdChange: -3.2,
    topTicker: 'META',
    topPct: 9.1,
    avatarInitials: 'TG',
    avatarColor: 'purple',
    holdings: [
      {
        ticker: 'META',
        companyName: 'Meta Platforms',
        value: 1_280_000_000,
        shares: 2_100_000,
        portfolioPct: 9.1,
        qoqChange: -2.1,
        isNew: false,
      },
      {
        ticker: 'AMZN',
        companyName: 'Amazon.com',
        value: 480_000_000,
        shares: 2_600_000,
        portfolioPct: 3.4,
        qoqChange: 100,
        isNew: true,
      },
    ],
    totalHoldings: 138,
    top5Concentration: 35,
    quarterlyTurnover: 18.2,
    description: 'Growth hedge fund · CIK 1167483',
  },
}

export const MOCK_INVESTMENTS: InvestmentRow[] = [
  {
    id: 'inv-bh-aapl',
    investorName: 'Berkshire Hathaway',
    investorCik: '1067983',
    investorType: 'value_fund',
    formType: '13F',
    ticker: 'AAPL',
    companyName: 'Apple Inc',
    filedAt: '2026-03-31',
    amount: 9_200_000_000,
    shares: 400_000_000,
    avgPrice: 173.4,
    action: 'increased',
    portfolioPct: 22.6,
    accessionNo: 'mock-bh-aapl',
    avatarInitials: 'BH',
    avatarColor: 'amber',
    sector: 'tech',
  },
  {
    id: 'inv-em-hon',
    investorName: 'Elliott Management',
    investorCik: '1048268',
    investorType: 'pe_activist',
    formType: '13D',
    ticker: 'HON',
    companyName: 'Honeywell International',
    filedAt: '2026-06-02',
    amount: 1_200_000_000,
    shares: 5_300_000,
    avgPrice: 226.1,
    action: 'new',
    portfolioPct: 8.3,
    accessionNo: 'mock-em-hon',
    avatarInitials: 'EM',
    avatarColor: 'blue',
    sector: 'tech',
  },
  {
    id: 'inv-bw-spy',
    investorName: 'Bridgewater Associates',
    investorCik: '1350694',
    investorType: 'hedge_fund',
    formType: '13F',
    ticker: 'SPY',
    companyName: 'SPDR S&P 500 ETF',
    filedAt: '2026-03-31',
    amount: 620_000_000,
    shares: 1_400_000,
    avgPrice: 445.2,
    action: 'increased',
    portfolioPct: 11.4,
    accessionNo: 'mock-bw-spy',
    avatarInitials: 'BW',
    avatarColor: 'teal',
    sector: 'tech',
  },
  {
    id: 'inv-tg-amzn',
    investorName: 'Tiger Global Management',
    investorCik: '1167483',
    investorType: 'hedge_fund',
    formType: '13F',
    ticker: 'AMZN',
    companyName: 'Amazon.com',
    filedAt: '2026-03-31',
    amount: 480_000_000,
    shares: 2_600_000,
    avgPrice: 184.5,
    action: 'new',
    portfolioPct: 3.4,
    accessionNo: 'mock-tg-amzn',
    avatarInitials: 'TG',
    avatarColor: 'purple',
    sector: 'tech',
  },
  {
    id: 'inv-jh-nvda',
    investorName: 'Jensen Huang',
    investorCik: '',
    investorType: 'individual',
    formType: '4',
    ticker: 'NVDA',
    companyName: 'NVIDIA Corp',
    filedAt: '2026-06-02',
    amount: 48_200_000,
    shares: 430_000,
    avgPrice: 112.09,
    action: 'buy',
    accessionNo: 'mock-jh-nvda',
    avatarInitials: 'JH',
    avatarColor: 'green',
    sector: 'tech',
  },
  {
    id: 'inv-sd-msft',
    investorName: 'Druckenmiller Fund',
    investorCik: '1536411',
    investorType: 'individual',
    formType: '13F',
    ticker: 'MSFT',
    companyName: 'Microsoft Corp',
    filedAt: '2026-03-31',
    amount: -330_000_000,
    shares: 640_000,
    avgPrice: 415.7,
    action: 'reduced',
    portfolioPct: 4.1,
    accessionNo: 'mock-sd-msft',
    avatarInitials: 'DT',
    avatarColor: 'coral',
    sector: 'tech',
  },
]

export function padCik(cik: string): string {
  const digits = cik.replace(/\D/g, '')
  return digits.padStart(10, '0')
}

export function formatAccessionForPath(accessionNo: string): string {
  return accessionNo.replace(/-/g, '')
}

export function dateMinusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export async function fetchSec(url: string): Promise<Response> {
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 60 },
  })
}

export function computeDashboardStats(filings: Filing[]): DashboardStats {
  const today = new Date().toISOString().slice(0, 10)
  const todayFilings = filings.filter((f) => f.filedAt.slice(0, 10) === today)
  return {
    filingsToday: todayFilings.length || filings.length,
    totalValueFiled: filings.reduce(
      (sum, f) => sum + Math.abs(f.amount ?? f.aum ?? 0),
      0
    ),
    insiderBuys: filings.filter((f) => f.formType === '4' && f.action === 'buy')
      .length,
    newThirteenDG: filings.filter(
      (f) =>
        (f.formType === '13D' || f.formType === '13G') &&
        (f.action === 'new' || f.action === 'increased')
    ).length,
  }
}

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function mapFormType(raw: string): FormType | null {
  const u = raw.toUpperCase()
  if (u.includes('13F')) return '13F'
  if (u === '4' || u.includes('FORM 4')) return '4'
  if (u.includes('13D')) return '13D'
  if (u.includes('13G')) return '13G'
  return null
}

function parseEftsHits(data: unknown, formType: FormType): Filing[] {
  const hits =
    (data as { hits?: { hits?: Array<{ _source?: Record<string, string> }> } })
      ?.hits?.hits ?? []
  const results: Filing[] = []
  for (const hit of hits) {
    const src = hit._source ?? {}
    const entityName = src.entity_name ?? src.display_names?.[0] ?? 'Unknown'
    const filedAt = src.file_date ?? src.period_of_report ?? new Date().toISOString()
    const accessionNo = src.file_num ?? `efts-${results.length}`
    const ft = mapFormType(src.form_type ?? formType) ?? formType
    results.push({
      id: `efts-${accessionNo}-${results.length}`,
      investorName: entityName,
      investorCik: src.cik ?? '',
      investorType: 'hedge_fund',
      formType: ft,
      filedAt: filedAt.includes('T') ? filedAt : `${filedAt}T12:00:00.000Z`,
      accessionNo,
      avatarInitials: initialsFromName(entityName),
      avatarColor: 'blue',
    })
  }
  return results
}

async function fetchEftsFilings(
  formType: FormType,
  startDays: number
): Promise<Filing[]> {
  const startdt = dateMinusDays(startDays)
  let q = `"${formType}"`
  let extra = ''
  if (formType === '13F') {
    q = '"13F-HR"'
    extra = '&forms=13F-HR'
  }
  const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(q)}&dateRange=custom&startdt=${startdt}&_source=file_date,entity_name,file_num,period_of_report,form_type${extra}`
  const res = await fetchSec(url)
  if (!res.ok) return []
  const data = await res.json()
  return parseEftsHits(data, formType)
}

async function fetchForm4Atom(): Promise<Filing[]> {
  const url =
    'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&dateb=&owner=include&count=20&search_text=&output=atom'
  const res = await fetchSec(url)
  if (!res.ok) return []
  const xml = await res.text()
  const entries = xml.split('<entry>').slice(1)
  const results: Filing[] = []
  for (const entry of entries) {
    const titleMatch = entry.match(/<title[^>]*>([^<]+)<\/title>/i)
    const updatedMatch = entry.match(/<updated>([^<]+)<\/updated>/i)
    const title = titleMatch?.[1]?.trim() ?? 'Form 4 Filing'
    const filedAt = updatedMatch?.[1] ?? new Date().toISOString()
    const action: Filing['action'] = /sell|sold|disposition/i.test(title)
      ? 'sell'
      : /buy|purchase|acquired/i.test(title)
        ? 'buy'
        : undefined
    const namePart = title.split(' - ')[0] ?? title
    results.push({
      id: `form4-${results.length}-${filedAt}`,
      investorName: namePart.slice(0, 80),
      investorCik: '',
      investorType: 'individual',
      formType: '4',
      filedAt,
      action,
      accessionNo: `atom-4-${results.length}`,
      avatarInitials: initialsFromName(namePart),
      avatarColor: action === 'sell' ? 'coral' : 'green',
    })
  }
  return results
}

function filterMockFilings(formTypes?: FormType[]): Filing[] {
  if (!formTypes?.length) return MOCK_FILINGS
  return MOCK_FILINGS.filter((f) => formTypes.includes(f.formType))
}

export async function getRecentFilings(
  formTypes?: FormType[]
): Promise<Filing[]> {
  const types = formTypes?.length
    ? formTypes
    : (['13F', '4', '13D', '13G'] as FormType[])

  try {
    const batches: Filing[] = []
    const tasks: Promise<Filing[]>[] = []

    if (types.includes('13F')) tasks.push(fetchEftsFilings('13F', 90))
    if (types.includes('13D')) tasks.push(fetchEftsFilings('13D', 7))
    if (types.includes('13G')) tasks.push(fetchEftsFilings('13G', 7))
    if (types.includes('4')) tasks.push(fetchForm4Atom())

    const settled = await Promise.all(tasks)
    for (const batch of settled) batches.push(...batch)

    if (batches.length > 0) {
      const seen = new Set<string>()
      return batches.filter((f) => {
        if (seen.has(f.id)) return false
        seen.add(f.id)
        return true
      })
    }
  } catch {
    /* fall through to mock */
  }

  return filterMockFilings(types)
}

export async function getInvestorSubmissions(cik: string): Promise<unknown> {
  const padded = padCik(cik)
  const url = `https://data.sec.gov/submissions/CIK${padded}.json`
  const res = await fetchSec(url)
  if (!res.ok) {
    throw new Error(`SEC submissions failed: ${res.status}`)
  }
  return res.json()
}

function parseHoldingsFromXml(xml: string): Holding[] {
  const holdings: Holding[] = []
  const blocks = xml.split(/<infoTable>/i).slice(1)
  for (const block of blocks) {
    const ticker =
      block.match(/<nameOfIssuer>([^<]*)<\/nameOfIssuer>/i)?.[1]?.trim() ?? ''
    const cusip = block.match(/<cusip>([^<]*)<\/cusip>/i)?.[1]?.trim() ?? ''
    const valueRaw = block.match(/<value>([^<]*)<\/value>/i)?.[1]
    const sharesRaw = block.match(/<sshPrnamt>([^<]*)<\/sshPrnamt>/i)?.[1]
    const value = valueRaw ? Number(valueRaw) * 1000 : 0
    const shares = sharesRaw ? Number(sharesRaw) : 0
    if (!ticker && !cusip) continue
    holdings.push({
      ticker: ticker.slice(0, 6) || cusip.slice(0, 6),
      companyName: ticker,
      value,
      shares,
      portfolioPct: 0,
      qoqChange: 0,
      isNew: false,
    })
  }
  return holdings
}

export async function getInvestorHoldings13F(
  cik: string,
  accessionNo: string
): Promise<Holding[]> {
  const paddedCik = padCik(cik).replace(/^0+/, '') || cik
  const accPath = formatAccessionForPath(accessionNo)
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${accPath}-index.htm`

  try {
    const indexRes = await fetchSec(indexUrl)
    if (!indexRes.ok) throw new Error('index not found')
    const html = await indexRes.text()
    const xmlPattern = /href="([^"]*\.xml)"/gi
    const xmlMatches: RegExpExecArray[] = []
    let xmlMatch: RegExpExecArray | null
    while ((xmlMatch = xmlPattern.exec(html)) !== null) {
      xmlMatches.push(xmlMatch)
    }
    const xmlHref =
      xmlMatches.find((m) =>
        /informationtable|infotable|form13f/i.test(m[1])
      )?.[1] ?? xmlMatches[0]?.[1]
    if (!xmlHref) throw new Error('no xml link')
    const xmlPath = xmlHref.startsWith('http')
      ? xmlHref
      : `https://www.sec.gov${xmlHref.startsWith('/') ? '' : '/Archives/edgar/data/' + paddedCik + '/'}${xmlHref}`
    const xmlRes = await fetchSec(xmlPath)
    if (!xmlRes.ok) throw new Error('xml fetch failed')
    const xml = await xmlRes.text()
    const holdings = parseHoldingsFromXml(xml)
    if (holdings.length > 0) {
      const total = holdings.reduce((s, h) => s + h.value, 0)
      return holdings.map((h) => ({
        ...h,
        portfolioPct: total > 0 ? (h.value / total) * 100 : 0,
      }))
    }
  } catch {
    /* fallback below */
  }

  const profile = MOCK_INVESTOR_PROFILES[padCik(cik)]
  return profile?.holdings ?? []
}

export async function buildInvestorProfile(cik: string): Promise<InvestorProfile> {
  const padded = padCik(cik)
  const submissions = (await getInvestorSubmissions(cik)) as {
    name?: string
    cik?: string
    filings?: { recent?: { form?: string[]; accessionNumber?: string[] } }
  }

  const name = submissions.name ?? 'Unknown Investor'
  const recent = submissions.filings?.recent
  let accessionNo = ''
  if (recent?.form && recent.accessionNumber) {
    const idx = recent.form.findIndex(
      (f) => f === '13F-HR' || f === '13F-HR/A'
    )
    if (idx >= 0) accessionNo = recent.accessionNumber[idx] ?? ''
    else {
      const fallbackIdx = recent.form.findIndex(
        (f) => f?.includes('13F') && !f?.includes('NT')
      )
      if (fallbackIdx >= 0) accessionNo = recent.accessionNumber[fallbackIdx] ?? ''
    }
  }

  const holdings = accessionNo
    ? await getInvestorHoldings13F(cik, accessionNo)
    : []

  const mock = MOCK_INVESTOR_PROFILES[padded]
  const base: Investor =
    mock ??
    MOCK_INVESTORS.find((i) => padCik(i.cik) === padded) ?? {
      cik: cik.replace(/\D/g, ''),
      name,
      type: 'hedge_fund',
      aum: 0,
      holdingsCount: holdings.length,
      lastFilingDate: new Date().toISOString().slice(0, 10),
      ytdChange: 0,
      topTicker: holdings[0]?.ticker ?? '',
      topPct: holdings[0]?.portfolioPct ?? 0,
      avatarInitials: initialsFromName(name),
      avatarColor: 'blue',
    }

  const finalHoldings = holdings.length > 0 ? holdings : (mock?.holdings ?? [])
  const top5 = finalHoldings
    .slice()
    .sort((a, b) => b.portfolioPct - a.portfolioPct)
    .slice(0, 5)
    .reduce((s, h) => s + h.portfolioPct, 0)

  return {
    ...base,
    name: base.name || name,
    holdings: finalHoldings,
    totalHoldings:
      finalHoldings.length > 0 ? finalHoldings.length : base.holdingsCount,
    top5Concentration: mock?.top5Concentration ?? top5,
    quarterlyTurnover: mock?.quarterlyTurnover ?? 0,
    description:
      mock?.description ?? `${name} · CIK ${base.cik} · SEC EDGAR filer`,
  }
}

export function filingsToInvestments(filings: Filing[]): InvestmentRow[] {
  return filings
    .filter((f) => f.ticker && f.action)
    .map((f) => ({
      ...f,
      sector: getSectorForTicker(f.ticker!),
    }))
}
