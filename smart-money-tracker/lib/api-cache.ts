export const API_CACHE_HEADERS = {
  'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
} as const

export const API_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
} as const
