import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  const eq = trimmed.indexOf('=')
  if (eq <= 0) return null

  const key = trimmed.slice(0, eq).trim()
  let value = trimmed.slice(eq + 1).trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return { key, value }
}

export function loadEnvFiles(cwd = process.cwd()): void {
  for (const filename of ['.env.local', '.env']) {
    const path = join(cwd, filename)
    if (!existsSync(path)) continue

    const content = readFileSync(path, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line)
      if (!parsed) continue
      if (process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value
      }
    }
  }
}

loadEnvFiles()
