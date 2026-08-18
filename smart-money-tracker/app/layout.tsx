import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Smart Money Tracker',
    template: '%s | Smart Money Tracker',
  },
  description:
    'Track real-time SEC filings — Form 13F, Form 4, 13D/G — from institutional investors, hedge funds, and insiders.',
  keywords: [
    'SEC filings',
    '13F',
    'hedge fund tracker',
    'insider trading',
    'institutional investors',
  ],
  openGraph: {
    title: 'Smart Money Tracker',
    description: 'Real-time institutional and insider investment tracker',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
