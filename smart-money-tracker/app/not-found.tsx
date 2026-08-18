import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6 text-center dark:bg-gray-950">
      <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100">
        Page not found
      </h1>
      <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link
        href="/dashboard/feed"
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
      >
        Back to Live Feed
      </Link>
    </div>
  )
}
