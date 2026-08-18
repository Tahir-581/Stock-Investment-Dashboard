import { getAvatarColors } from '@/lib/utils'

const SIZE_MAP = {
  sm: 'size-6 text-[10px]',
  md: 'size-7 text-[10px]',
  lg: 'size-12 text-base',
} as const

type InvestorAvatarProps = {
  initials: string
  color: string
  size?: keyof typeof SIZE_MAP
}

export function InvestorAvatar({
  initials,
  color,
  size = 'md',
}: InvestorAvatarProps) {
  const { bg, text } = getAvatarColors(color)

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${bg} ${text} ${SIZE_MAP[size]}`}
    >
      {initials}
    </span>
  )
}
