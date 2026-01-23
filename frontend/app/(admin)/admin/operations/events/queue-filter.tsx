"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import {
  EVENT_QUEUE_DEFINITIONS,
  EVENT_QUEUE_NAMES,
  type EventQueueName,
} from "@/lib/server/events/queues"
import { adminPath } from "@/lib/routes"
import { buildQuery } from "@/lib/urlParams"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const QUEUE_OPTIONS: Array<{ label: string; value: EventQueueName | "all" }> = [
  { label: "All queues", value: "all" },
  ...EVENT_QUEUE_NAMES.map((queue) => ({
    value: queue,
    label: EVENT_QUEUE_DEFINITIONS[queue].label,
  })),
]

export default function QueueFilter({
  queue,
}: {
  queue: EventQueueName | "all"
}) {
  const router = useRouter()
  const pathname = usePathname() ?? adminPath("operations", "events")
  const searchParams = useSearchParams()

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
        Queue
      </span>
      <Select
        value={queue}
        onValueChange={(value) => {
          const url = buildQuery(pathname, searchParams?.toString() ?? "", {
            queue: value === "all" ? undefined : value,
            page: "1",
          })
          router.push(url, { scroll: false })
        }}
      >
        <SelectTrigger className="h-9 w-[200px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-foreground">
          <SelectValue placeholder="Filter queue" />
        </SelectTrigger>
        <SelectContent side="bottom">
          {QUEUE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
