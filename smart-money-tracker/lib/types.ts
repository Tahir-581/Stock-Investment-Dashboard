export type FormType = '13F' | '4' | '13D' | '13G'
export type ActionType = 'new' | 'increased' | 'reduced' | 'exited' | 'buy' | 'sell'
export type InvestorType =
  | 'hedge_fund'
  | 'pe_activist'
  | 'individual'
  | 'mutual_fund'
  | 'value_fund'

export interface Filing {
  id: string
  investorName: string
  investorCik: string
  investorType: InvestorType
  formType: FormType
  ticker?: string
  companyName?: string
  filedAt: string
  transactionDate?: string
  amount?: number
  shares?: number
  avgPrice?: number
  action?: ActionType
  aum?: number
  portfolioPct?: number
  accessionNo: string
  avatarInitials: string
  avatarColor: string
}

export interface Investor {
  cik: string
  name: string
  type: InvestorType
  aum: number
  holdingsCount: number
  lastFilingDate: string
  ytdChange: number
  topTicker: string
  topPct: number
  avatarInitials: string
  avatarColor: string
}

export interface Holding {
  ticker: string
  companyName: string
  value: number
  shares: number
  portfolioPct: number
  qoqChange: number
  isNew: boolean
}

export interface InvestorProfile extends Investor {
  holdings: Holding[]
  totalHoldings: number
  top5Concentration: number
  quarterlyTurnover: number
  description: string
  reportPeriods?: string[]
  latestReportPeriod?: string
}

export interface DashboardStats {
  filingsToday: number
  totalValueFiled: number
  insiderBuys: number
  newThirteenDG: number
}

export type Sector =
  | 'tech'
  | 'energy'
  | 'finance'
  | 'healthcare'
  | 'consumer'
export type InvestmentRow = Filing & { sector: Sector }

export type TrumpSourceType =
  | 'truth_social'
  | 'whitehouse_remarks'
  | 'reuters_ap'
  | 'financial_news'

export type TrumpSentiment = 'positive' | 'negative' | 'neutral' | 'mixed'

export type TrumpMentionType =
  | 'investment_announcement'
  | 'policy_related'
  | 'direct_praise'
  | 'direct_criticism'
  | 'indirect'

export interface RawSourcePost {
  id: string
  text: string
  url: string
  title: string
  publishedAt: string
  sourceType: TrumpSourceType
}

export interface TrumpMention {
  id?: string
  createdAt?: string
  ticker: string
  companyName: string
  sector?: string
  sentiment: TrumpSentiment
  mentionType?: TrumpMentionType
  trumpQuote: string
  context?: string
  confidence: number
  marketImpactLikely: boolean
  sourceType: TrumpSourceType
  sourceUrl: string
  sourceTitle?: string
  postedAt: string
  priceAtMention?: number | null
  price1hAfter?: number | null
  price8hAfter?: number | null
  price16hAfter?: number | null
  price24hAfter?: number | null
  pctMove1h?: number | null
  pctMove8h?: number | null
  pctMove16h?: number | null
  pctMove24h?: number | null
  sourcePostId: string
}
