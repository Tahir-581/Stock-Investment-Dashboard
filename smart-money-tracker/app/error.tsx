'use client'

import { ErrorState } from '@/components/ErrorState'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 dark:bg-gray-950">
      <ErrorState
        message={error.message || 'Something went wrong'}
        onRetry={reset}
      />
    </div>
  )
}
