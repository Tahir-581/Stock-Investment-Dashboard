import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type NavItemProps = {
  href: string
  icon: LucideIcon
  label: string
  active: boolean
  muted?: boolean
  badge?: string
}

export function NavItem({
  href,
  icon: Icon,
  label,
  active,
  muted = false,
  badge,
}: NavItemProps) {
  return (
    <Link
      href={href}
      className={[
        'flex h-9 w-full items-center gap-2 px-3 text-[13px] transition-colors',
        muted
          ? 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900'
          : active
            ? 'border-l-2 border-[#3B82F6] bg-gray-100 font-semibold text-gray-900 dark:bg-gray-800 dark:text-gray-100'
            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900',
      ].join(' ')}
    >
      <Icon className="size-[15px] shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-400">
          <span
            className="size-1 animate-pulse rounded-full bg-red-500"
            aria-hidden
          />
          {badge}
        </span>
      ) : null}
    </Link>
  )
}
