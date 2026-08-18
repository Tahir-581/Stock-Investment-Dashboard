type FilterOption = {
  label: string
  value: string
}

type FilterChipsProps = {
  options: FilterOption[]
  selected: string
  onChange: (value: string) => void
}

export function FilterChips({ options, selected, onChange }: FilterChipsProps) {
  return (
    <div className="-mx-1 mb-3.5 overflow-x-auto px-1 pb-1">
      <div className="flex flex-nowrap gap-2">
        {options.map((option) => {
          const isSelected = option.value === selected
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                isSelected
                  ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
