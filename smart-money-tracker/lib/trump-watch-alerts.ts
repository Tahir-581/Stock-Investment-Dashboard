export type TrumpAlertType =
  | 'any_mention'
  | 'positive_only'
  | 'negative_only'
  | 'specific_ticker'
  | 'high_confidence'
  | 'truth_social_markets'

export type TrumpAlertRecord = {
  id: string
  name: string
  alertType: TrumpAlertType
  ticker?: string
  confidenceThreshold?: number
  email: string
  active: boolean
  description: string
}

export type TrumpWatchPreferences = {
  enabled: boolean
  highConfidenceOnly: boolean
  marketMovingOnly: boolean
  email: string
}

export type TrumpWatchStorage = {
  preferences: TrumpWatchPreferences
  alerts: TrumpAlertRecord[]
}

export const STORAGE_KEY = 'trump_watch_alerts'

export const DEFAULT_PREFERENCES: TrumpWatchPreferences = {
  enabled: false,
  highConfidenceOnly: false,
  marketMovingOnly: false,
  email: '',
}

export const DEFAULT_TRUMP_ALERTS: TrumpAlertRecord[] = [
  {
    id: 'default-high-confidence',
    name: 'High-confidence mentions',
    alertType: 'high_confidence',
    confidenceThreshold: 0.9,
    email: '',
    active: true,
    description: 'Any stock mentioned by Trump with ≥ 90% confidence',
  },
  {
    id: 'default-negative',
    name: 'Bearish mentions',
    alertType: 'negative_only',
    email: '',
    active: true,
    description: 'Any negative mention (bearish)',
  },
  {
    id: 'default-truth-social',
    name: 'Truth Social markets',
    alertType: 'truth_social_markets',
    email: '',
    active: false,
    description: 'Truth Social post about markets',
  },
]

const DEFAULT_STORAGE: TrumpWatchStorage = {
  preferences: DEFAULT_PREFERENCES,
  alerts: DEFAULT_TRUMP_ALERTS,
}

export function loadTrumpWatchStorage(): TrumpWatchStorage {
  if (typeof window === 'undefined') return DEFAULT_STORAGE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STORAGE
    const parsed = JSON.parse(raw) as Partial<TrumpWatchStorage>
    return {
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...parsed.preferences,
      },
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : DEFAULT_TRUMP_ALERTS,
    }
  } catch {
    return DEFAULT_STORAGE
  }
}

export function saveTrumpWatchStorage(storage: TrumpWatchStorage): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
}

export function getTrumpWatchStorage(): TrumpWatchStorage {
  if (typeof window === 'undefined') return DEFAULT_STORAGE

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    saveTrumpWatchStorage(DEFAULT_STORAGE)
    return DEFAULT_STORAGE
  }

  return loadTrumpWatchStorage()
}

export function updateTrumpWatchPreferences(
  preferences: TrumpWatchPreferences
): TrumpWatchStorage {
  const storage = getTrumpWatchStorage()
  const next = { ...storage, preferences }
  saveTrumpWatchStorage(next)
  return next
}

export function updateTrumpWatchAlerts(
  alerts: TrumpAlertRecord[]
): TrumpWatchStorage {
  const storage = getTrumpWatchStorage()
  const next = { ...storage, alerts }
  saveTrumpWatchStorage(next)
  return next
}

export const TRUMP_ALERT_TYPE_OPTIONS: {
  label: string
  value: TrumpAlertType
}[] = [
  { label: 'Any mention', value: 'any_mention' },
  { label: 'Positive only', value: 'positive_only' },
  { label: 'Negative only', value: 'negative_only' },
  { label: 'Specific ticker', value: 'specific_ticker' },
]

export function getTrumpAlertDescription(alert: TrumpAlertRecord): string {
  if (alert.description) return alert.description
  switch (alert.alertType) {
    case 'any_mention':
      return 'Any stock mentioned by Trump'
    case 'positive_only':
      return 'Positive (bullish) mentions only'
    case 'negative_only':
      return 'Negative (bearish) mentions only'
    case 'specific_ticker':
      return alert.ticker
        ? `Mentions of ${alert.ticker.toUpperCase()}`
        : 'Specific ticker mentions'
    case 'high_confidence':
      return `Confidence ≥ ${((alert.confidenceThreshold ?? 0.9) * 100).toFixed(0)}%`
    case 'truth_social_markets':
      return 'Truth Social post about markets'
    default:
      return alert.name
  }
}
