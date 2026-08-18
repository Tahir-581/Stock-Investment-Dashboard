import type { Metadata } from 'next'
import { TrumpWatchNav } from '@/components/trump/TrumpWatchNav'

export const metadata: Metadata = {
  title: 'Trump Watch — Live Stock Mentions',
}

export default function TrumpWatchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <TrumpWatchNav />
      <div className="pt-4">{children}</div>
    </div>
  )
}
