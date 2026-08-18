'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Sidebar, type SidebarActive } from '@/components/Sidebar'
import { ToastProvider } from '@/components/Toast'
import { TopBar } from '@/components/TopBar'

function getActiveFromPathname(pathname: string): SidebarActive {
  if (pathname.startsWith('/dashboard/feed')) return 'feed'
  if (pathname.startsWith('/dashboard/investments')) return 'investments'
  if (
    pathname.startsWith('/dashboard/investors') ||
    pathname.startsWith('/dashboard/investor/')
  ) {
    return 'investors'
  }
  if (pathname.startsWith('/dashboard/alerts')) return 'alerts'
  if (pathname.startsWith('/dashboard/insiders')) return 'insiders'
  if (pathname.startsWith('/dashboard/trump-watch')) return 'trump-watch'
  return null
}

function getTitleFromPathname(pathname: string): string {
  if (pathname.startsWith('/dashboard/feed')) return 'Live Feed'
  if (pathname.startsWith('/dashboard/investments')) return 'Investments'
  if (pathname.startsWith('/dashboard/investor/')) return 'Investor Profile'
  if (pathname.startsWith('/dashboard/investors')) return 'Investors'
  if (pathname.startsWith('/dashboard/insiders')) return 'Insiders'
  if (pathname.startsWith('/dashboard/alerts')) return 'Alerts'
  if (pathname.startsWith('/dashboard/trump-watch')) return 'Trump Watch'
  return 'Dashboard'
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const active = getActiveFromPathname(pathname)
  const title = getTitleFromPathname(pathname)

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar active={active} />
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar title={title} onRefresh={() => router.refresh()} />
          <main className="min-h-0 flex-1 overflow-y-auto p-5">{children}</main>
        </div>
      </div>
    </ToastProvider>
  )
}
