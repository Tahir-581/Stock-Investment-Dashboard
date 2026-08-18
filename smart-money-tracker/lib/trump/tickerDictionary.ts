export const TICKER_DICTIONARY: Record<
  string,
  {
    ticker: string
    company: string
    sector: string
    aliases: string[]
  }
> = {
  apple: {
    ticker: 'AAPL',
    company: 'Apple Inc',
    sector: 'Technology',
    aliases: ['apple inc', 'apple computer', "tim cook's company", 'cupertino'],
  },
  microsoft: {
    ticker: 'MSFT',
    company: 'Microsoft Corp',
    sector: 'Technology',
    aliases: ['microsoft corp', 'ms', 'windows', 'azure', 'satya nadella'],
  },
  nvidia: {
    ticker: 'NVDA',
    company: 'NVIDIA Corp',
    sector: 'Technology',
    aliases: ['nvidia', 'nvda', 'jensen huang', 'graphics chips'],
  },
  google: {
    ticker: 'GOOGL',
    company: 'Alphabet Inc',
    sector: 'Technology',
    aliases: ['alphabet', 'youtube', 'google search', 'sundar pichai'],
  },
  meta: {
    ticker: 'META',
    company: 'Meta Platforms',
    sector: 'Technology',
    aliases: ['facebook', 'instagram', 'zuckerberg', 'mark zuckerberg', 'whatsapp'],
  },
  amazon: {
    ticker: 'AMZN',
    company: 'Amazon.com Inc',
    sector: 'Technology',
    aliases: ['amazon.com', 'jeff bezos', 'whole foods', 'aws', 'bezos'],
  },
  tesla: {
    ticker: 'TSLA',
    company: 'Tesla Inc',
    sector: 'Technology',
    aliases: ['tesla motors', 'elon musk', 'electric cars', 'elon'],
  },
  x: {
    ticker: 'PRIVATE',
    company: 'X Corp (Twitter)',
    sector: 'Technology',
    aliases: ['twitter', 'x corp', 'x.com', 'elon musk twitter'],
  },
  openai: {
    ticker: 'PRIVATE',
    company: 'OpenAI',
    sector: 'Technology',
    aliases: ['chatgpt', 'open ai', 'sam altman'],
  },
  'goldman sachs': {
    ticker: 'GS',
    company: 'Goldman Sachs',
    sector: 'Finance',
    aliases: ['goldman', 'gs', 'david solomon'],
  },
  jpmorgan: {
    ticker: 'JPM',
    company: 'JPMorgan Chase',
    sector: 'Finance',
    aliases: ['jp morgan', 'chase bank', 'jamie dimon', 'jpmc'],
  },
  'bank of america': {
    ticker: 'BAC',
    company: 'Bank of America',
    sector: 'Finance',
    aliases: ['bofa', 'bank of america corp'],
  },
  berkshire: {
    ticker: 'BRK-B',
    company: 'Berkshire Hathaway',
    sector: 'Finance',
    aliases: ['berkshire hathaway', 'warren buffett', 'buffett'],
  },
  boeing: {
    ticker: 'BA',
    company: 'Boeing Co',
    sector: 'Industrial',
    aliases: ['boeing company', 'boeing aircraft', 'kelly ortberg'],
  },
  lockheed: {
    ticker: 'LMT',
    company: 'Lockheed Martin',
    sector: 'Defense',
    aliases: ['lockheed martin', 'f-35', 'f35'],
  },
  raytheon: {
    ticker: 'RTX',
    company: 'RTX Corp',
    sector: 'Defense',
    aliases: ['rtx', 'raytheon technologies'],
  },
  'general motors': {
    ticker: 'GM',
    company: 'General Motors',
    sector: 'Industrial',
    aliases: ['gm', 'mary barra', 'chevrolet', 'cadillac', 'gmc'],
  },
  ford: {
    ticker: 'F',
    company: 'Ford Motor Company',
    sector: 'Industrial',
    aliases: ['ford motor', 'ford trucks', 'jim farley'],
  },
  caterpillar: {
    ticker: 'CAT',
    company: 'Caterpillar Inc',
    sector: 'Industrial',
    aliases: ['cat', 'cat equipment'],
  },
  'us steel': {
    ticker: 'X',
    company: 'U.S. Steel Corp',
    sector: 'Industrial',
    aliases: ['united states steel', 'u.s. steel', 'american steel'],
  },
  nucor: {
    ticker: 'NUE',
    company: 'Nucor Corp',
    sector: 'Industrial',
    aliases: ['nucor steel'],
  },
  exxon: {
    ticker: 'XOM',
    company: 'ExxonMobil',
    sector: 'Energy',
    aliases: ['exxonmobil', 'exxon mobil', 'esso'],
  },
  chevron: {
    ticker: 'CVX',
    company: 'Chevron Corp',
    sector: 'Energy',
    aliases: ['chevron corporation'],
  },
  halliburton: {
    ticker: 'HAL',
    company: 'Halliburton Co',
    sector: 'Energy',
    aliases: [],
  },
  pfizer: {
    ticker: 'PFE',
    company: 'Pfizer Inc',
    sector: 'Healthcare',
    aliases: ['pfizer inc', 'covid vaccine maker'],
  },
  'johnson johnson': {
    ticker: 'JNJ',
    company: 'Johnson & Johnson',
    sector: 'Healthcare',
    aliases: ['j&j', 'j and j', 'johnson and johnson'],
  },
  moderna: {
    ticker: 'MRNA',
    company: 'Moderna Inc',
    sector: 'Healthcare',
    aliases: ['moderna inc', 'mrna vaccine'],
  },
  walmart: {
    ticker: 'WMT',
    company: 'Walmart Inc',
    sector: 'Consumer',
    aliases: ['wal-mart', 'walmart inc', 'doug mcmillon'],
  },
  mcdonalds: {
    ticker: 'MCD',
    company: "McDonald's Corp",
    sector: 'Consumer',
    aliases: ["mcdonald's", 'mickey d', 'golden arches'],
  },
  'coca cola': {
    ticker: 'KO',
    company: 'The Coca-Cola Co',
    sector: 'Consumer',
    aliases: ['coke', 'coca-cola', 'coca cola company'],
  },
  disney: {
    ticker: 'DIS',
    company: 'Walt Disney Co',
    sector: 'Consumer',
    aliases: ['walt disney', 'disney+', 'espn', 'bob iger'],
  },
  fox: {
    ticker: 'FOX',
    company: 'Fox Corp',
    sector: 'Consumer',
    aliases: ['fox news', 'fox corporation', 'rupert murdoch'],
  },
  comcast: {
    ticker: 'CMCSA',
    company: 'Comcast Corp',
    sector: 'Consumer',
    aliases: ['nbc', 'msnbc', 'nbcuniversal', 'brian roberts'],
  },
  bitcoin: {
    ticker: 'BTC-USD',
    company: 'Bitcoin',
    sector: 'Crypto',
    aliases: ['btc', 'crypto', 'digital currency', 'cryptocurrency'],
  },
  'steel industry': {
    ticker: 'SLX',
    company: 'Steel ETF',
    sector: 'Industrial',
    aliases: ['steel companies', 'american steel industry', 'steel tariffs'],
  },
  'bank sector': {
    ticker: 'XLF',
    company: 'Financial Sector ETF',
    sector: 'Finance',
    aliases: ['banks', 'banking sector', 'financial sector', 'wall street banks'],
  },
  'energy sector': {
    ticker: 'XLE',
    company: 'Energy Sector ETF',
    sector: 'Energy',
    aliases: ['oil companies', 'energy companies', 'oil and gas'],
  },
  'tech sector': {
    ticker: 'QQQ',
    company: 'Nasdaq-100 ETF',
    sector: 'Technology',
    aliases: ['big tech', 'tech companies', 'silicon valley'],
  },
  'auto industry': {
    ticker: 'CARZ',
    company: 'Auto Industry ETF',
    sector: 'Industrial',
    aliases: ['car companies', 'automakers', 'auto industry', 'car manufacturers'],
  },
}

export const ALIAS_LOOKUP: Record<string, string> = {}
for (const [key, val] of Object.entries(TICKER_DICTIONARY)) {
  ALIAS_LOOKUP[key.toLowerCase()] = key
  for (const alias of val.aliases) {
    ALIAS_LOOKUP[alias.toLowerCase()] = key
  }
}

export function lookupCompany(
  text: string
): (typeof TICKER_DICTIONARY)[string] | null {
  const lower = text.toLowerCase().trim()
  if (TICKER_DICTIONARY[lower]) return TICKER_DICTIONARY[lower]
  const key = ALIAS_LOOKUP[lower]
  if (key) return TICKER_DICTIONARY[key]
  return null
}
