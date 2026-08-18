import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Insiders · Smart Money Tracker',
  description: 'Corporate insider Form 4 trade disclosures',
}

export default function InsidersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
