import type { Metadata } from 'next'

type LayoutProps = {
  children: React.ReactNode
  params: { ticker: string }
}

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const ticker = params.ticker.toUpperCase()
  return {
    title: `${ticker} — Trump Mentions`,
  }
}

export default function TrumpTickerLayout({ children }: LayoutProps) {
  return children
}
