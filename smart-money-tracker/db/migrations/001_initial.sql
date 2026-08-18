-- Form 13F filer directory and holdings schema

CREATE TYPE investor_type AS ENUM (
  'hedge_fund',
  'pe_activist',
  'individual',
  'mutual_fund',
  'value_fund',
  'unknown'
);

CREATE TABLE filers (
  cik CHAR(10) PRIMARY KEY,
  name TEXT NOT NULL,
  investor_type investor_type NOT NULL DEFAULT 'unknown',
  last_report_period DATE,
  last_filing_date DATE,
  total_portfolio_value BIGINT NOT NULL DEFAULT 0,
  holdings_count INTEGER NOT NULL DEFAULT 0,
  top_ticker TEXT NOT NULL DEFAULT '',
  top_pct NUMERIC(8, 4) NOT NULL DEFAULT 0,
  avatar_initials TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT 'blue',
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, ''))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_filers_name ON filers (name);
CREATE INDEX idx_filers_investor_type ON filers (investor_type);
CREATE INDEX idx_filers_total_portfolio_value ON filers (total_portfolio_value DESC);
CREATE INDEX idx_filers_last_filing_date ON filers (last_filing_date DESC);
CREATE INDEX idx_filers_search_vector ON filers USING GIN (search_vector);

CREATE TABLE filings_13f (
  accession_number VARCHAR(25) PRIMARY KEY,
  cik CHAR(10) NOT NULL REFERENCES filers (cik) ON DELETE CASCADE,
  report_period DATE NOT NULL,
  filed_at DATE,
  form_type VARCHAR(20) NOT NULL DEFAULT '13F-HR',
  quarter_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_filings_13f_cik_period ON filings_13f (cik, report_period);
CREATE INDEX idx_filings_13f_report_period ON filings_13f (report_period DESC);

CREATE TABLE holdings (
  id BIGSERIAL PRIMARY KEY,
  accession_number VARCHAR(25) NOT NULL REFERENCES filings_13f (accession_number) ON DELETE CASCADE,
  cik CHAR(10) NOT NULL REFERENCES filers (cik) ON DELETE CASCADE,
  report_period DATE NOT NULL,
  name_of_issuer TEXT NOT NULL DEFAULT '',
  cusip CHAR(9) NOT NULL DEFAULT '',
  ticker TEXT,
  title_of_class TEXT NOT NULL DEFAULT '',
  value_usd BIGINT NOT NULL DEFAULT 0,
  shares BIGINT NOT NULL DEFAULT 0,
  portfolio_pct NUMERIC(10, 6) NOT NULL DEFAULT 0,
  qoq_change_pct NUMERIC(10, 4) NOT NULL DEFAULT 0,
  is_new BOOLEAN NOT NULL DEFAULT FALSE,
  infotable_sk BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holdings_cik_period ON holdings (cik, report_period);
CREATE INDEX idx_holdings_accession ON holdings (accession_number);
CREATE INDEX idx_holdings_ticker ON holdings (ticker) WHERE ticker IS NOT NULL;
CREATE INDEX idx_holdings_value ON holdings (cik, report_period, value_usd DESC);
CREATE UNIQUE INDEX idx_holdings_unique_position ON holdings (accession_number, cusip, name_of_issuer, title_of_class);

CREATE TABLE cusip_ticker_map (
  cusip CHAR(9) PRIMARY KEY,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cusip_ticker_map_ticker ON cusip_ticker_map (ticker);

CREATE TABLE ingestion_runs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  quarter_label TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  row_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT
);

CREATE INDEX idx_ingestion_runs_quarter ON ingestion_runs (quarter_label DESC);

-- Form 4 insiders (Phase 4)
CREATE TABLE insiders (
  id BIGSERIAL PRIMARY KEY,
  reporting_owner_cik CHAR(10),
  name TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  company_cik CHAR(10),
  ticker TEXT,
  form_type TEXT NOT NULL DEFAULT '4',
  filed_at TIMESTAMPTZ NOT NULL,
  transaction_date DATE,
  action TEXT,
  amount BIGINT,
  shares BIGINT,
  avg_price NUMERIC(12, 4),
  accession_number TEXT NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(company_name, '') || ' ' || coalesce(ticker, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insiders_name ON insiders (name);
CREATE INDEX idx_insiders_reporting_owner_cik ON insiders (reporting_owner_cik);
CREATE INDEX idx_insiders_filed_at ON insiders (filed_at DESC);
CREATE INDEX idx_insiders_search_vector ON insiders USING GIN (search_vector);
CREATE UNIQUE INDEX idx_insiders_accession_unique ON insiders (accession_number, name, transaction_date, action, shares);
