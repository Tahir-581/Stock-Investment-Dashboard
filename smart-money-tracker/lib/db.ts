import { Pool, type QueryResultRow } from 'pg'

let pool: Pool | null = null

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl())
}

export function getPool(): Pool {
  const url = getDatabaseUrl()
  if (!url) {
    throw new Error('DATABASE_URL is not configured')
  }
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
    })
  }
  return pool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query<T>(text, params)
  return result.rows
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

export function padCikDb(cik: string): string {
  const digits = cik.replace(/\D/g, '')
  if (!digits || /^0+$/.test(digits)) return ''
  return digits.padStart(10, '0')
}

export function stripCikLeadingZeros(cik: string): string {
  return cik.replace(/^0+/, '') || '0'
}
