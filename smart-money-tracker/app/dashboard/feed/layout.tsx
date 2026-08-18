import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live Feed',
}

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
