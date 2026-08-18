'use client'

import { useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getCurrentQuarterLabel } from '@/lib/utils'

type TopBarProps = {
  title: string
  onRefresh: () => void
}

export function TopBar({ title, onRefresh }: TopBarProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const dateTimeLabel =
    now != null
      ? new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
        }).format(now)
      : '—'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 dark:border-gray-800 dark:bg-gray-950">
      <h1 className="min-w-0 flex-1 truncate text-[15px] font-medium text-gray-900 dark:text-gray-100">
        {title}
      </h1>

      <div className="flex flex-1 justify-center">
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          {getCurrentQuarterLabel()}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
          <span
            className="size-1.5 animate-pulse rounded-full bg-green-500"
            aria-hidden
          />
          ● Live
        </span>
        <ThemeToggle />
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label="Refresh data"
        >
          <RotateCw className="size-4" />
        </button>
        <time
          className="min-w-[140px] text-right text-[11px] tabular-nums text-gray-500 dark:text-gray-400"
          dateTime={now?.toISOString()}
        >
          {dateTimeLabel}
        </time>
      </div>
    </header>
  )
}
