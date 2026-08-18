'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/components/Toast'
import {
  TRUMP_ALERT_TYPE_OPTIONS,
  getTrumpAlertDescription,
  getTrumpWatchStorage,
  updateTrumpWatchAlerts,
  type TrumpAlertRecord,
  type TrumpAlertType,
} from '@/lib/trump-watch-alerts'

const emptyForm = {
  name: '',
  alertType: 'any_mention' as TrumpAlertType,
  ticker: '',
  confidenceThreshold: 0.9,
  email: '',
}

export default function TrumpWatchAlertsPage() {
  const { showToast } = useToast()
  const [alerts, setAlerts] = useState<TrumpAlertRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    setAlerts(getTrumpWatchStorage().alerts)
  }, [])

  function persist(next: TrumpAlertRecord[]) {
    setAlerts(next)
    updateTrumpWatchAlerts(next)
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  function handleCreate() {
    if (!form.name.trim()) {
      showToast('Please enter an alert name', 'error')
      return
    }
    if (form.alertType === 'specific_ticker' && !form.ticker.trim()) {
      showToast('Please enter a ticker', 'error')
      return
    }

    const record: TrumpAlertRecord = {
      id: editingId ?? `custom-${Date.now()}`,
      name: form.name.trim(),
      alertType: form.alertType,
      ticker:
        form.alertType === 'specific_ticker'
          ? form.ticker.trim().toUpperCase()
          : undefined,
      confidenceThreshold: form.confidenceThreshold,
      email: form.email.trim(),
      active: editingId
        ? (alerts.find((a) => a.id === editingId)?.active ?? true)
        : true,
      description: getTrumpAlertDescription({
        id: '',
        name: form.name,
        alertType: form.alertType,
        ticker: form.ticker,
        confidenceThreshold: form.confidenceThreshold,
        email: form.email,
        active: true,
        description: '',
      }),
    }

    if (editingId) {
      persist(alerts.map((a) => (a.id === editingId ? record : a)))
      showToast('Alert updated', 'success')
    } else {
      persist([...alerts, record])
      showToast('Alert created', 'success')
    }
    resetForm()
  }

  function toggleActive(id: string) {
    persist(
      alerts.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    )
  }

  function deleteAlert(id: string) {
    persist(alerts.filter((a) => a.id !== id))
    showToast('Alert deleted', 'success')
  }

  function startEdit(alert: TrumpAlertRecord) {
    setForm({
      name: alert.name,
      alertType: TRUMP_ALERT_TYPE_OPTIONS.some((o) => o.value === alert.alertType)
        ? (alert.alertType as TrumpAlertType)
        : 'any_mention',
      ticker: alert.ticker ?? '',
      confidenceThreshold: alert.confidenceThreshold ?? 0.9,
      email: alert.email,
    })
    setEditingId(alert.id)
    setShowForm(true)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Your Trump Watch alerts
      </h1>
      <p className="mb-6 text-[13px] text-gray-500 dark:text-gray-400">
        Get notified when Trump mentions stocks matching your criteria
      </p>

      <div className="mb-6 flex flex-col gap-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                  {alert.name}
                </span>
                <span
                  className={[
                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                    alert.active
                      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                  ].join(' ')}
                >
                  {alert.active ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
                {getTrumpAlertDescription(alert)}
              </p>
              {alert.email ? (
                <p className="mt-0.5 text-[11px] text-gray-400">
                  → {alert.email}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => toggleActive(alert.id)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {alert.active ? 'Pause' : 'Resume'}
              </button>
              <button
                type="button"
                onClick={() => startEdit(alert)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Edit alert"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => deleteAlert(alert.id)}
                className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                aria-label="Delete alert"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mb-6 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-[13px] font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900"
        >
          + Add alert
        </button>
      ) : (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-[13px] font-medium text-gray-900 dark:text-gray-100">
            {editingId ? 'Edit alert' : 'Add alert'}
          </h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-gray-500">
                Alert name
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                placeholder="My Trump alert"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-gray-500">
                Alert type
              </label>
              <select
                value={form.alertType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    alertType: e.target.value as TrumpAlertType,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              >
                {TRUMP_ALERT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {form.alertType === 'specific_ticker' ? (
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">
                  Ticker
                </label>
                <input
                  value={form.ticker}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ticker: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] uppercase dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  placeholder="AAPL"
                />
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-[11px] text-gray-500">
                Confidence threshold:{' '}
                {(form.confidenceThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min={0.7}
                max={1}
                step={0.05}
                value={form.confidenceThreshold}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    confidenceThreshold: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-gray-500">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                placeholder="you@email.com"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                className="rounded-lg bg-gray-900 px-4 py-2 text-[12px] font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900"
              >
                {editingId ? 'Save' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-600 dark:border-gray-700 dark:text-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
