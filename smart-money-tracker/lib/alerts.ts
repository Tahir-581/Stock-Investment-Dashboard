export type AlertType =
  | 'form4_buy'
  | 'form4_sell'
  | 'new_13f'
  | 'new_13d_13g'
  | 'pct_threshold'

export type ProfileAlertTrigger =
  | '13f'
  | 'new_position'
  | 'add_position'
  | '13d'

export type AlertRecord = {
  id: string
  name: string
  alertType: AlertType | ProfileAlertTrigger
  investor: string
  minAmount?: number
  email: string
  active: boolean
  description?: string
  investorCik?: string
  investorName?: string
  trigger?: ProfileAlertTrigger
}

export const STORAGE_KEY = 'smt_alerts'

export const DEFAULT_ALERTS: AlertRecord[] = [
  {
    id: 'default-form4-buys',
    name: 'Form 4 insider buys ≥ $1M',
    alertType: 'form4_buy',
    investor: 'any',
    minAmount: 1_000_000,
    email: '',
    active: true,
    description: 'Alert when C-suite buys ≥ $1M of own stock',
  },
  {
    id: 'default-13d-activist',
    name: 'New 13D activist filing',
    alertType: 'new_13d_13g',
    investor: 'any',
    email: '',
    active: true,
    description: 'Any 5%+ ownership stake filed',
  },
  {
    id: 'default-berkshire-13f',
    name: 'Berkshire Hathaway 13F filed',
    alertType: 'new_13f',
    investor: 'Berkshire Hathaway',
    investorCik: '1067983',
    investorName: 'Berkshire Hathaway',
    email: '',
    active: true,
    description: 'Quarterly 13F from Berkshire Hathaway',
  },
]

export function loadAlerts(): AlertRecord[] {
  if (typeof window === 'undefined') return DEFAULT_ALERTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ALERTS
    const parsed = JSON.parse(raw) as AlertRecord[]
    return Array.isArray(parsed) ? parsed : DEFAULT_ALERTS
  } catch {
    return DEFAULT_ALERTS
  }
}

export function saveAlerts(alerts: AlertRecord[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
}

export function getAllAlerts(): AlertRecord[] {
  const stored = loadAlerts()
  if (typeof window === 'undefined') return DEFAULT_ALERTS

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    saveAlerts(DEFAULT_ALERTS)
    return DEFAULT_ALERTS
  }

  return stored
}

export function appendAlert(alert: AlertRecord): AlertRecord[] {
  const alerts = getAllAlerts()
  const next = [...alerts, alert]
  saveAlerts(next)
  return next
}

export function updateAlerts(alerts: AlertRecord[]): AlertRecord[] {
  saveAlerts(alerts)
  return alerts
}

export function getAlertTrackingLabel(alert: AlertRecord): string {
  if (alert.id === 'default-form4-buys') return 'Tracking 12 investors'
  if (alert.id === 'default-13d-activist') return 'All filers'
  if (alert.investorName) return alert.investorName
  if (alert.investor && alert.investor !== 'any') return alert.investor
  return 'All filers'
}

export const ALERT_TYPE_OPTIONS: { label: string; value: AlertType }[] = [
  { label: 'Form 4 Buy', value: 'form4_buy' },
  { label: 'Form 4 Sell', value: 'form4_sell' },
  { label: 'New 13F', value: 'new_13f' },
  { label: 'New 13D/13G', value: 'new_13d_13g' },
  { label: '% threshold change', value: 'pct_threshold' },
]

export const PROFILE_TRIGGER_LABELS: Record<ProfileAlertTrigger, string> = {
  '13f': 'Files any new 13F',
  new_position: 'Opens a new position',
  add_position: 'Adds to an existing position',
  '13d': 'Files a 13D',
}
