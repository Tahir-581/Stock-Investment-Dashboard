'use client'

import { AlertCircle } from 'lucide-react'

type ErrorStateProps = {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex min-h-[200px] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <AlertCircle
          className="mx-auto mb-3 size-8 text-red-500 dark:text-red-400"
          aria-hidden
        />
        <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  )
}
