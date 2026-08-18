import { Flame } from 'lucide-react'

type TrumpWatchEmptyStateProps = {
  showClearFilters?: boolean
  onClearFilters?: () => void
}

export function TrumpWatchEmptyState({
  showClearFilters = false,
  onClearFilters,
}: TrumpWatchEmptyStateProps) {
  return (
    <div className="flex min-h-[200px] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <Flame
          className="mx-auto mb-3 size-8 text-orange-500 dark:text-orange-400"
          aria-hidden
        />
        <p className="text-[14px] text-gray-500 dark:text-gray-400">
          No mentions found
        </p>
        <p className="mt-1 text-[12px] text-gray-400 dark:text-gray-500">
          Trump hasn&apos;t mentioned any stocks matching this filter yet
        </p>
        {showClearFilters && onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 text-[12px] font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  )
}
