import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trump Stock Watchlist — All-Time Tracker',
}

export default function TrumpWatchlistLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
