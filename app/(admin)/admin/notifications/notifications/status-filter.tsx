"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { adminPath } from "@/lib/routes"
import {
  ADMIN_NOTIFICATION_STATUS_OPTIONS,
  type AdminNotificationStatusFilter,
} from "@/lib/notifications/admin"
import { buildQuery } from "@/lib/urlParams"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export default function NotificationStatusFilter({
  status,
}: {
  status: AdminNotificationStatusFilter
}) {
  const router = useRouter()
  const pathname =
    usePathname() ?? adminPath("notifications", "notifications")
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
            status: value === "all" ? undefined : value,
            page: "1",
          })
          router.push(url, { scroll: false })
        }}
      >
        <SelectTrigger className="h-9 w-[200px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-foreground">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent side="bottom">
          {ADMIN_NOTIFICATION_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
