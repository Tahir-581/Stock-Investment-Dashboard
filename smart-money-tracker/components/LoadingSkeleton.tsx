type LoadingSkeletonProps = {
  rows?: number
  columns?: number
}

export function LoadingSkeleton({
  rows = 5,
  columns = 4,
}: LoadingSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-3 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-3 border-b border-gray-200 px-3 py-3 last:border-b-0 dark:border-gray-800"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-3 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      ))}
    </div>
  )
}
