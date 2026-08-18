import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trump Watch Alerts',
}

export default function TrumpWatchAlertsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
