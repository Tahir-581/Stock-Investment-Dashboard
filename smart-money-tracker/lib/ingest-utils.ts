export const USER_AGENT =
  process.env.SEC_USER_AGENT ?? 'SmartMoneyTracker contact@smartmoneytracker.com'

export function padCik(cik: string): string {
  const digits = cik.replace(/\D/g, '')
  if (!digits || /^0+$/.test(digits)) return ''
  return digits.padStart(10, '0')
}

export function isValidCik(cik: string): boolean {
  const digits = cik.replace(/\D/g, '')
  return digits.length > 0 && !/^0+$/.test(digits)
}

export function parseSecDate(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const m = trimmed.match(/^(\d{1,2})-([A-Z]{3})-(\d{4})$/i)
  if (m) {
    const months: Record<string, string> = {
      JAN: '01',
      FEB: '02',
      MAR: '03',
      APR: '04',
      MAY: '05',
      JUN: '06',
      JUL: '07',
      AUG: '08',
      SEP: '09',
      OCT: '10',
      NOV: '11',
      DEC: '12',
    }
    const mon = months[m[2].toUpperCase()]
    if (mon) return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`
  }
  return trimmed.slice(0, 10)
}

export function parseTsvLine(line: string): string[] {
  return line.split('\t').map((cell) => cell.trim())
}

export function parseTsvHeader(line: string): Map<string, number> {
  const cols = parseTsvLine(line)
  const map = new Map<string, number>()
  cols.forEach((col, i) => map.set(col.toUpperCase(), i))
  return map
}

export function getField(
  row: string[],
  header: Map<string, number>,
  name: string
): string {
  const idx = header.get(name.toUpperCase())
  if (idx === undefined) return ''
  return row[idx] ?? ''
}

export function classifyInvestorType(name: string): string {
  const upper = name.toUpperCase()
  if (
    /BERKSHIRE|VALUE|HOLDINGS INC\.?$|TRUST|CAPITAL MANAGEMENT LLC/.test(
      upper
    ) &&
    !/HEDGE/.test(upper)
  ) {
    if (/BERKSHIRE|MUNGER|BUFFETT/.test(upper)) return 'value_fund'
  }
  if (/MUTUAL FUND|FUND TRUST|INDEX FUND|VANGUARD|FIDELITY|BLACKROCK FUNDS/.test(upper)) {
    return 'mutual_fund'
  }
  if (/ELLIOTT|ACTIVIST|PERSHING|SARISSA|STARBOARD|JANA|THIRD POINT|ICAHN/.test(upper)) {
    return 'pe_activist'
  }
  if (
    /FAMILY OFFICE|DUQUESNE|DRUCKENMILLER|SOROS FUND|SAC CAPITAL|INDIVIDUAL/.test(
      upper
    )
  ) {
    return 'individual'
  }
  if (
    /FUND|CAPITAL|PARTNERS|MANAGEMENT|ADVISORS|INVESTMENTS|ASSET|LLC|LP|L\.P\.|HOLDINGS|GROUP|SECURITIES/.test(
      upper
    )
  ) {
    return 'hedge_fund'
  }
  return 'unknown'
}

export function normalize13FValue(raw: string, reportPeriod: string): number {
  const n = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(n)) return 0
  const periodDate = new Date(reportPeriod)
  const cutoff = new Date('2023-01-03')
  if (periodDate >= cutoff) return Math.round(n)
  return Math.round(n * 1000)
}

export async function fetchSecText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!res.ok) throw new Error(`SEC fetch failed ${res.status}: ${url}`)
  return res.text()
}

export async function fetchSecBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!res.ok) throw new Error(`SEC fetch failed ${res.status}: ${url}`)
  return res.arrayBuffer()
}

export async function resolveLatest13FZipUrl(): Promise<{
  url: string
  label: string
}> {
  const envUrl = process.env.SEC_13F_ZIP_URL
  if (envUrl) {
    return { url: envUrl, label: process.env.SEC_13F_QUARTER_LABEL ?? 'custom' }
  }

  const html = await fetchSecText(
    'https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets'
  )
  const linkMatch =
    html.match(
      /href="(\/files\/structureddata\/data\/form-13f-data-sets\/[^"]+\.zip)"/i
    ) ??
    html.match(/href="(\/files\/data\/research\/[^"]+\.zip)"/i) ??
    html.match(/href="([^"]*form13f[^"]*\.zip)"/i)
  if (!linkMatch) {
    throw new Error('Could not find 13F ZIP download link on SEC page')
  }
  const path = linkMatch[1].startsWith('http')
    ? linkMatch[1]
    : `https://www.sec.gov${linkMatch[1]}`
  const url = path
  const labelMatch = url.match(/([^/]+)\.zip/i)
  return { url, label: labelMatch?.[1] ?? 'latest' }
}

export function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export const AVATAR_COLORS = ['blue', 'teal', 'purple', 'amber', 'green', 'coral']

export function avatarColorForCik(cik: string): string {
  const n = parseInt(cik.replace(/\D/g, ''), 10) || 0
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}
