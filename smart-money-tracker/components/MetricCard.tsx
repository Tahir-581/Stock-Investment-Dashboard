type MetricCardProps = {
  label: string
  value: string
  sub?: string
  subPositive?: boolean
}

export function MetricCard({ label, value, sub, subPositive }: MetricCardProps) {
  const subColor =
    subPositive === undefined
      ? 'text-gray-500 dark:text-gray-400'
      : subPositive
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400'

  return (
    <div className="rounded-lg bg-gray-50 px-3.5 py-3 dark:bg-gray-900">
      <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="text-[20px] font-medium text-gray-900 dark:text-gray-100">
        {value}
      </div>
      {sub ? (
        <div className={`mt-0.5 text-[11px] ${subColor}`}>{sub}</div>
      ) : null}
    </div>
  )
}
