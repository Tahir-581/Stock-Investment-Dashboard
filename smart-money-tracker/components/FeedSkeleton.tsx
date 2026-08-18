export function FeedSkeleton() {
  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[72px] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="mb-3.5 h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="mb-3.5 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="rounded-lg border border-gray-200 px-3.5 dark:border-gray-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 border-b border-gray-200 py-3 last:border-b-0 dark:border-gray-800"
          >
            <div className="mt-1.5 size-2 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="h-3.5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  )
}
