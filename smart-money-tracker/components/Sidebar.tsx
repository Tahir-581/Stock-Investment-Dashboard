import {
  Zap,
  BarChart2,
  Users,
  Bell,
  Settings,
  UserCircle,
  Flame,
} from 'lucide-react'
import { NavItem } from './NavItem'

export type SidebarActive =
  | 'feed'
  | 'investments'
  | 'investors'
  | 'insiders'
  | 'alerts'
  | 'trump-watch'
  | null

type SidebarProps = {
  active: SidebarActive
}

export function Sidebar({ active }: SidebarProps) {
  return (
    <aside className="sticky top-0 z-10 flex h-screen w-[220px] shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-2.5">
          <div
            className="mt-0.5 size-6 shrink-0 rounded-sm bg-gray-900 dark:bg-gray-100"
            aria-hidden
          />
          <div>
            <div className="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">
              Smart Money
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Tracker</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className="size-1.5 shrink-0 animate-pulse rounded-full bg-green-500"
            aria-hidden
          />
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            <span className="font-medium text-green-600 dark:text-green-500">
              ● Live
            </span>{' '}
            EDGAR connected
          </span>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-0">
        <NavItem
          href="/dashboard/feed"
          icon={Zap}
          label="Live Feed"
          active={active === 'feed'}
        />
        <NavItem
          href="/dashboard/investments"
          icon={BarChart2}
          label="Investments"
          active={active === 'investments'}
        />
        <NavItem
          href="/dashboard/investors"
          icon={Users}
          label="Investors"
          active={active === 'investors'}
        />
        <NavItem
          href="/dashboard/insiders"
          icon={UserCircle}
          label="Insiders"
          active={active === 'insiders'}
        />
        <NavItem
          href="/dashboard/alerts"
          icon={Bell}
          label="Alerts"
          active={active === 'alerts'}
        />
        <NavItem
          href="/dashboard/trump-watch"
          icon={Flame}
          label="Trump Watch"
          active={active === 'trump-watch'}
          badge="LIVE"
        />
      </nav>

      <div className="my-2 border-t border-gray-200 dark:border-gray-800" />

      <div className="px-0">
        <NavItem
          href="#"
          icon={Settings}
          label="Settings"
          active={false}
          muted
        />
      </div>

      <div className="flex-1" />

      <div className="px-4 py-4 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
        Data source: SEC EDGAR
        <br />
        Forms: 13F · Form 4 · 13D/G
        <br />
        Refreshes every 60s
      </div>
    </aside>
  )
}
