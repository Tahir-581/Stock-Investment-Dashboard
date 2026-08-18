import {
  Building2,
  ExternalLink,
  Flame,
  Mic,
  Newspaper,
  Radio,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TrumpSourceType } from '@/lib/types'

type SourceConfig = {
  icon: LucideIcon
  label: string
  colorClass: string
}

const SOURCE_CONFIG: Record<string, SourceConfig> = {
  truth_social: {
    icon: Flame,
    label: 'Truth Social',
    colorClass: 'text-orange-600 dark:text-orange-400',
  },
  press_conference: {
    icon: Mic,
    label: 'Press Conference',
    colorClass: 'text-blue-600 dark:text-blue-400',
  },
  whitehouse_remarks: {
    icon: Building2,
    label: 'White House',
    colorClass: 'text-gray-600 dark:text-gray-400',
  },
  reuters_ap: {
    icon: Radio,
    label: 'Reuters/AP',
    colorClass: 'text-red-600 dark:text-red-400',
  },
  financial_news: {
    icon: Newspaper,
    label: 'Financial News',
    colorClass: 'text-purple-600 dark:text-purple-400',
  },
}

type SourceBadgeProps = {
  sourceType: TrumpSourceType | string
  sourceUrl: string
  sourceTitle?: string
}

export function SourceBadge({
  sourceType,
  sourceUrl,
  sourceTitle,
}: SourceBadgeProps) {
  const config = SOURCE_CONFIG[sourceType] ?? {
    icon: Newspaper,
    label: sourceType.replace(/_/g, ' '),
    colorClass: 'text-gray-600 dark:text-gray-400',
  }
  const Icon = config.icon

  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-[11px] hover:underline ${config.colorClass}`}
      title={sourceTitle}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span>{config.label}</span>
      <ExternalLink className="size-2.5 shrink-0 opacity-70" aria-hidden />
    </a>
  )
}
