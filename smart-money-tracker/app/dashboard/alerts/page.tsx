'use client'

import { Bell, Pencil, Trash2, User, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  ALERT_TYPE_OPTIONS,
  getAlertTrackingLabel,
  getAllAlerts,
  updateAlerts,
  type AlertRecord,
  type AlertType,
} from '@/lib/alerts'

function getAlertIcon(alert: AlertRecord) {
  const type = alert.alertType
  if (type === 'form4_buy' || type === 'form4_sell') {
    return User
  }
  if (type === 'new_13d_13g' || type === '13d') {
    return Zap
  }
  return Bell
}

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; alert: AlertRecord }

const emptyForm = {
  name: '',
  alertType: 'form4_buy' as AlertType,
  investor: 'any',
  minAmount: '',
  email: '',
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    setAlerts(getAllAlerts())
  }, [])

  function persist(next: AlertRecord[]) {
    setAlerts(next)
    updateAlerts(next)
  }

  function openCreate() {
    setForm(emptyForm)
    setModal({ mode: 'create' })
  }

  function openEdit(alert: AlertRecord) {
    const validTypes = ALERT_TYPE_OPTIONS.map((o) => o.value)
    setForm({
      name: alert.name,
      alertType: validTypes.includes(alert.alertType as AlertType)
        ? (alert.alertType as AlertType)
        : 'new_13f',
      investor: alert.investor,
      minAmount: alert.minAmount != null ? String(alert.minAmount) : '',
      email: alert.email,
    })
    setModal({ mode: 'edit', alert })
  }

  function closeModal() {
    setModal({ mode: 'closed' })
    setForm(emptyForm)
  }

  function handleSave() {
    if (!form.name.trim()) return

    const record: AlertRecord = {
      id:
        modal.mode === 'edit'
          ? modal.alert.id
          : `custom-${Date.now()}`,
      name: form.name.trim(),
      alertType: form.alertType,
      investor: form.investor.trim() || 'any',
      minAmount: form.minAmount ? Number(form.minAmount) : undefined,
      email: form.email.trim(),
      active: modal.mode === 'edit' ? modal.alert.active : true,
      description:
        modal.mode === 'edit' ? modal.alert.description : undefined,
      investorCik:
        modal.mode === 'edit' ? modal.alert.investorCik : undefined,
      investorName:
        modal.mode === 'edit' ? modal.alert.investorName : undefined,
    }

    if (modal.mode === 'edit') {
      persist(alerts.map((a) => (a.id === record.id ? record : a)))
    } else {
      persist([...alerts, record])
    }

    closeModal()
  }

  function toggleActive(id: string) {
    persist(
      alerts.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    )
  }

  function deleteAlert(id: string) {
    persist(alerts.filter((a) => a.id !== id))
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
          Your alerts
        </h2>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
        >
          Add new
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {alerts.map((alert) => {
          const Icon = getAlertIcon(alert)
          return (
            <div
              key={alert.id}
              className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {alert.name}
                  </h3>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(alert)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    aria-label="Edit alert"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAlert(alert.id)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
                    aria-label="Delete alert"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              {alert.description ? (
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  {alert.description}
                </p>
              ) : null}

              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleActive(alert.id)}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                    alert.active
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {alert.active ? 'Active' : 'Paused'}
                </button>
              </div>

              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {getAlertTrackingLabel(alert)}
              </p>
            </div>
          )
        })}
      </div>

      {modal.mode !== 'closed' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-medium text-gray-900 dark:text-gray-100">
              {modal.mode === 'edit' ? 'Edit alert' : 'Add new alert'}
            </h3>

            <div className="mb-3">
              <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                Alert name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                Alert type
              </label>
              <select
                value={form.alertType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    alertType: e.target.value as AlertType,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {ALERT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                Investor
              </label>
              <input
                type="text"
                value={form.investor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, investor: e.target.value }))
                }
                placeholder="any"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                Minimum amount
              </label>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={form.minAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minAmount: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pr-3 pl-7 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                Notification email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {modal.mode === 'edit' ? 'Save changes' : 'Create alert'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
