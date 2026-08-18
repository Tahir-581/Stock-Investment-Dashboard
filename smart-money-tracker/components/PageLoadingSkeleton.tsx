export function PageLoadingSkeleton() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 px-4">
      <div className="h-4 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-full max-w-md animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="h-32 w-full max-w-lg animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
    </div>
  )
}
