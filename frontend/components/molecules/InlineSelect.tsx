"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"

type Option = { value: string; label: string }

export function InlineSelect({
  value,
  onValueChange,
  options,
  triggerClassName,
  placeholder,
  testId,
  dropdownTestId,
  ariaLabel,
  ariaLabelledBy,
}: {
  value: string
  onValueChange: (v: string) => void
  options: Option[]
  triggerClassName?: string
  placeholder?: string
  testId?: string
  dropdownTestId?: string
  ariaLabel?: string
  ariaLabelledBy?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={triggerClassName ?? "h-8 w-[200px]"}
        data-testid={testId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent data-testid={dropdownTestId}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default InlineSelect
