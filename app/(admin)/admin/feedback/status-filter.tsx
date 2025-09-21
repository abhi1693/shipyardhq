"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { buildQuery } from "@/lib/urlParams"
import { FeedbackStatus } from "@/lib/vendor/prisma/client"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const STATUS_OPTIONS: Array<{ label: string; value: FeedbackStatus | "all" }> =
  [
    { label: "All statuses", value: "all" },
    { label: "Received", value: "received" },
    { label: "In review", value: "in_review" },
    { label: "Closed", value: "closed" },
  ]

export default function StatusFilter({
  status,
}: {
  status: FeedbackStatus | "all"
}) {
  const router = useRouter()
  const pathname = usePathname() ?? "/admin/feedback"
  const searchParams = useSearchParams()

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
        Status
      </span>
      <Select
        value={status}
        onValueChange={(value) => {
          const url = buildQuery(pathname, searchParams?.toString() ?? "", {
            status: value,
            page: "1",
          })
          router.push(url, { scroll: false })
        }}
      >
        <SelectTrigger className="h-9 w-[200px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-foreground">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent side="bottom">
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
