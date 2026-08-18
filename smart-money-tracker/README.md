# Smart Money Tracker

Track SEC filings — Form 13F, Form 4, 13D/G — from institutional investors, hedge funds, and insiders.

## Getting started

```bash
cd smart-money-tracker
npm install
cp .env.example .env.local   # set DATABASE_URL
npm run db:migrate
npm run ingest:13f           # download & ingest latest SEC 13F quarter (~80MB)
npm run ingest:tickers       # seed CUSIP/ticker map
npm run ingest:form4         # optional: Form 4 insiders
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/dashboard/feed`.

Without `DATABASE_URL`, the app falls back to mock data (5 investors, partial holdings).

## Scripts

CLI scripts (`db:migrate`, `ingest:*`, `backfill:filers`) load **`.env.local`** automatically (same file as `npm run dev`). Ensure `DATABASE_URL` is set there before running them.

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply Postgres migrations |
| `npm run ingest:13f` | Ingest SEC quarterly 13F bulk dataset |
| `npm run ingest:13f -- --prior` | Hint for prior-quarter backfill |
| `npm run ingest:tickers` | Refresh CUSIP/ticker mapping |
| `npm run ingest:delta` | Sync recent 13F filers from EFTS |
| `npm run ingest:form4` | Ingest Form 4 insider trades |
| `npm run backfill:filers` | Refresh filer AUM and holdings count from `holdings` table |

## Deploy on Vercel

1. Import the repository in [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `smart-money-tracker`.
3. Add **`DATABASE_URL`** environment variable (Neon recommended).
4. Run ingestion via GitHub Actions (`.github/workflows/ingest-13f.yml`) or locally.

### Routes

- `/dashboard/feed` — Live filing feed
- `/dashboard/investments` — QoQ position changes from 13F data
- `/dashboard/investors` — Searchable 13F filer directory (paginated)
- `/dashboard/insiders` — Form 4 insider trades
- `/dashboard/alerts` — Custom alerts
- `/dashboard/investor/[cik]` — Investor profile with full paginated holdings

## Data sources

- **13F filers & holdings**: [SEC Form 13F Data Sets](https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets) (quarterly bulk ZIP)
- **Live feed**: SEC EFTS + Form 4 atom feed
- **Insiders**: Form 4 atom feed → `insiders` table

## Trump Watch

Tracks Trump mentions of public companies and correlates them with stock price moves. **Zero API keys required** — uses free RSS feeds, local NLP, and Yahoo Finance (via `yahoo-finance2`).

### Local setup

Trump Watch uses a separate **SQLite** database at `data/trump-watch.db` (auto-created, gitignored). No `DATABASE_URL` needed.

If using **pnpm**, `better-sqlite3` native builds are enabled via `pnpm.onlyBuiltDependencies` in `package.json`. Run `pnpm install` after clone.

Seed data locally:

```bash
curl http://localhost:3000/api/trump/cron
```

### API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/trump/mentions` | Recent mentions (`?sentiment`, `?source_type`, `?ticker`, `?days`, `?limit`, `?offset`) |
| `GET /api/trump/watchlist` | Aggregated ticker watchlist |
| `GET /api/trump/stats` | Summary stats |
| `GET /api/trump/cron` | Run ingestion pipeline (fetch RSS → extract → store) |
| `GET /api/trump/price-update` | Backfill 1h/24h price reactions |

Returns mock data when the SQLite DB is empty (first run before cron).

### Data sources (all free, no keys)

- Truth Social public RSS (`@realDonaldTrump`)
- White House official remarks RSS
- Reuters, Yahoo Finance, MarketWatch RSS (Trump-filtered)

### Deploy notes

- **SQLite on Vercel**: stored in `/tmp` — ephemeral across cold starts and deployments. Data persists within a session only.
- **Persistent storage on Vercel free tier**: migrate to [Turso](https://turso.tech) (free SQLite cloud, 500MB) — future enhancement.
- **Cron scheduling**: Vercel crons require **Pro plan** ($20/mo). Free alternative: [cron-job.org](https://cron-job.org) hitting `https://your-app.vercel.app/api/trump/cron` every 2 minutes.
- Optional: set `CRON_SECRET` env var and uncomment auth check in `app/api/trump/cron/route.ts`.
