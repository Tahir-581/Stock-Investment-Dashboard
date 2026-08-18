'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard/trump-watch', label: 'Live Feed', exact: true },
  {
    href: '/dashboard/trump-watch/watchlist',
    label: 'All-Time Watchlist',
    exact: false,
  },
  { href: '/dashboard/trump-watch/alerts', label: 'My Alerts', exact: false },
] as const

function isTabActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) {
    return pathname === href
  }
  return pathname.startsWith(href)
}

export function TrumpWatchNav() {
  const pathname = usePathname()

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
      {TABS.map((tab) => {
        const active = isTabActive(pathname, tab.href, tab.exact)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              'shrink-0 whitespace-nowrap px-3 pb-2.5 text-[13px] font-medium transition-colors',
              active
                ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
