import type { FormType } from '@/lib/types'
import { getFormBadgeColors } from '@/lib/utils'

const FORM_LABELS: Record<FormType, string> = {
  '13F': '13F',
  '4': 'Form 4',
  '13D': '13D',
  '13G': '13G',
}

type FilingBadgeProps = {
  form: FormType
}

export function FilingBadge({ form }: FilingBadgeProps) {
  const { bg, text } = getFormBadgeColors(form)

  return (
    <span
      className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${bg} ${text}`}
    >
      {FORM_LABELS[form]}
    </span>
  )
}
