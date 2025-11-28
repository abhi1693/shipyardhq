"use client"

import { useTransition } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"

type RangeOption = {
  value: string
  label: string
}

export function ProductAnalyticsRangeDropdown({
  options,
  value,
  defaultValue,
}: {
  options: RangeOption[]
  value: string
  defaultValue: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleChange = (nextValue: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? "")
      if (nextValue === defaultValue) {
        params.delete("range")
      } else {
        params.set("range", nextValue)
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    })
  }

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={isPending}
      name="analytics-range"
    >
      <SelectTrigger
        size="sm"
        aria-label="Select analytics range"
        className="cursor-pointer"
      >
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent className="cursor-pointer">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="cursor-pointer"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
