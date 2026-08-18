import Link from 'next/link'

export default function InvestorAnalysisPage({
  params,
}: {
  params: { cik: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Thesis analysis coming soon
      </h1>
      <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
        AI-powered portfolio thesis analysis for this investor will be available
        here.
      </p>
      <Link
        href={`/dashboard/investor/${params.cik}`}
        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        Back to investor profile
      </Link>
    </div>
  )
}
