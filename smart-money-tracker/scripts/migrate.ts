import '../lib/load-env'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { getPool, isDatabaseConfigured } from '../lib/db'

async function main() {
  if (!isDatabaseConfigured()) {
    console.error(
      'DATABASE_URL is not set. Create smart-money-tracker/.env.local from .env.example and set your Postgres URL.'
    )
    process.exit(1)
  }

  const pool = getPool()
  const migrationsDir = join(process.cwd(), 'db', 'migrations')
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const applied = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY filename'
  )
  const appliedSet = new Set(applied.rows.map((r) => r.filename))

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`Skipping ${file} (already applied)`)
      continue
    }

    const content = readFileSync(join(migrationsDir, file), 'utf8')
    console.log(`Applying ${file}...`)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(content)
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      )
      await client.query('COMMIT')
      console.log(`Applied ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  await pool.end()
  console.log('Migrations complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
