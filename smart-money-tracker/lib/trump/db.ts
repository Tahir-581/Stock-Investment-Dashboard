import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const isVercel = process.env.VERCEL === '1'
const DB_PATH = isVercel
  ? '/tmp/smart-money-tracker.db'
  : path.join(process.cwd(), 'data', 'trump-watch.db')

if (!isVercel) {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

let _db: Database.Database | null = null

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  type: string
) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string
  }[]
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  }
}

export function getDb(): Database.Database {
  if (_db) return _db
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  initSchema(_db)
  return _db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trump_mentions (
      id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      created_at          TEXT DEFAULT (datetime('now')),
      ticker              TEXT NOT NULL,
      company_name        TEXT NOT NULL,
      sector              TEXT,
      sentiment           TEXT NOT NULL CHECK (sentiment IN ('positive','negative','neutral','mixed')),
      mention_type        TEXT,
      trump_quote         TEXT NOT NULL,
      context             TEXT,
      confidence          REAL,
      market_impact_likely INTEGER DEFAULT 0,
      source_type         TEXT NOT NULL,
      source_url          TEXT NOT NULL,
      source_title        TEXT,
      posted_at           TEXT NOT NULL,
      price_at_mention    REAL,
      price_1h_after      REAL,
      price_24h_after     REAL,
      pct_move_1h         REAL,
      pct_move_24h        REAL,
      source_post_id      TEXT UNIQUE NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ticker ON trump_mentions(ticker);
    CREATE INDEX IF NOT EXISTS idx_posted_at ON trump_mentions(posted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sentiment ON trump_mentions(sentiment);
    CREATE INDEX IF NOT EXISTS idx_source_type ON trump_mentions(source_type);
  `)

  ensureColumn(db, 'trump_mentions', 'price_8h_after', 'REAL')
  ensureColumn(db, 'trump_mentions', 'pct_move_8h', 'REAL')
  ensureColumn(db, 'trump_mentions', 'price_16h_after', 'REAL')
  ensureColumn(db, 'trump_mentions', 'pct_move_16h', 'REAL')
  ensureColumn(db, 'trump_mentions', 'prices_unavailable', 'INTEGER DEFAULT 0')
}

export function markPricesUnavailable(id: string): void {
  const db = getDb()
  db.prepare(
    `UPDATE trump_mentions SET prices_unavailable = 1 WHERE id = @id`
  ).run({ id })
}

export function queryMentions(filters: {
  sentiment?: string
  source_type?: string
  ticker?: string
  days?: number
  limit?: number
  offset?: number
}): Record<string, unknown>[] {
  const db = getDb()
  let sql = `SELECT * FROM trump_mentions WHERE 1=1`
  const params: unknown[] = []

  if (filters.sentiment) {
    sql += ` AND sentiment = ?`
    params.push(filters.sentiment)
  }
  if (filters.source_type) {
    sql += ` AND source_type = ?`
    params.push(filters.source_type)
  }
  if (filters.ticker) {
    sql += ` AND ticker = ?`
    params.push(filters.ticker.toUpperCase())
  }
  if (filters.days) {
    sql += ` AND posted_at >= datetime('now', ?)`
    params.push(`-${filters.days} days`)
  }

  sql += ` ORDER BY posted_at DESC`
  sql += ` LIMIT ? OFFSET ?`
  params.push(filters.limit ?? 20, filters.offset ?? 0)

  return db.prepare(sql).all(...params) as Record<string, unknown>[]
}

export function queryWatchlist(): Record<string, unknown>[] {
  const db = getDb()
  return db
    .prepare(
      `
    SELECT
      ticker,
      company_name,
      sector,
      COUNT(*) as total_mentions,
      SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
      SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count,
      SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
      ROUND(AVG(confidence), 2) as avg_confidence,
      ROUND(AVG(pct_move_24h), 2) as avg_24h_move,
      ROUND(AVG(pct_move_1h), 2) as avg_1h_move,
      MAX(posted_at) as last_mentioned_at,
      MIN(posted_at) as first_mentioned_at,
      MAX(market_impact_likely) as ever_market_moving
    FROM trump_mentions
    GROUP BY ticker, company_name, sector
    ORDER BY total_mentions DESC
  `
    )
    .all() as Record<string, unknown>[]
}

export function queryStats(): Record<string, unknown> {
  const db = getDb()
  const total = db.prepare(`SELECT COUNT(*) as c FROM trump_mentions`).get() as {
    c: number
  }
  const today = db
    .prepare(
      `
    SELECT COUNT(*) as c FROM trump_mentions
    WHERE posted_at >= datetime('now', 'start of day')
  `
    )
    .get() as { c: number }
  const tickers = db
    .prepare(`SELECT COUNT(DISTINCT ticker) as c FROM trump_mentions`)
    .get() as { c: number }
  const avgMove = db
    .prepare(
      `
    SELECT ROUND(AVG(pct_move_24h), 2) as avg FROM trump_mentions
    WHERE pct_move_24h IS NOT NULL
  `
    )
    .get() as { avg: number | null }
  const biggest = db
    .prepare(
      `
    SELECT ticker, pct_move_24h FROM trump_mentions
    WHERE pct_move_24h IS NOT NULL
    ORDER BY ABS(pct_move_24h) DESC LIMIT 1
  `
    )
    .get() as { ticker: string; pct_move_24h: number } | undefined

  return {
    totalMentions: total.c,
    mentionsToday: today.c,
    tickersTracked: tickers.c,
    avgMarketMove: avgMove.avg ?? 0,
    biggestMover: biggest
      ? { ticker: biggest.ticker, pct: biggest.pct_move_24h }
      : null,
    lastCheckedAt: new Date().toISOString(),
  }
}

export function insertMention(mention: Record<string, unknown>): boolean {
  const db = getDb()
  try {
    const result = db
      .prepare(
        `
      INSERT OR IGNORE INTO trump_mentions (
        ticker, company_name, sector, sentiment, mention_type, trump_quote,
        context, confidence, market_impact_likely, source_type, source_url,
        source_title, posted_at, price_at_mention, source_post_id
      ) VALUES (
        @ticker, @company_name, @sector, @sentiment, @mention_type, @trump_quote,
        @context, @confidence, @market_impact_likely, @source_type, @source_url,
        @source_title, @posted_at, @price_at_mention, @source_post_id
      )
    `
      )
      .run(mention)
    return result.changes > 0
  } catch {
    return false
  }
}

export function updatePrices(
  id: string,
  prices: {
    price_at_mention?: number
    price_1h_after?: number
    price_8h_after?: number
    price_16h_after?: number
    price_24h_after?: number
    pct_move_1h?: number
    pct_move_8h?: number
    pct_move_16h?: number
    pct_move_24h?: number
  }
) {
  const db = getDb()
  db.prepare(
    `
    UPDATE trump_mentions SET
      price_at_mention = COALESCE(@price_at_mention, price_at_mention),
      price_1h_after = COALESCE(@price_1h_after, price_1h_after),
      price_8h_after = COALESCE(@price_8h_after, price_8h_after),
      price_16h_after = COALESCE(@price_16h_after, price_16h_after),
      price_24h_after = COALESCE(@price_24h_after, price_24h_after),
      pct_move_1h = COALESCE(@pct_move_1h, pct_move_1h),
      pct_move_8h = COALESCE(@pct_move_8h, pct_move_8h),
      pct_move_16h = COALESCE(@pct_move_16h, pct_move_16h),
      pct_move_24h = COALESCE(@pct_move_24h, pct_move_24h)
    WHERE id = @id
  `
  ).run({
    id,
    price_at_mention: prices.price_at_mention ?? null,
    price_1h_after: prices.price_1h_after ?? null,
    price_8h_after: prices.price_8h_after ?? null,
    price_16h_after: prices.price_16h_after ?? null,
    price_24h_after: prices.price_24h_after ?? null,
    pct_move_1h: prices.pct_move_1h ?? null,
    pct_move_8h: prices.pct_move_8h ?? null,
    pct_move_16h: prices.pct_move_16h ?? null,
    pct_move_24h: prices.pct_move_24h ?? null,
  })
}
