import type { NotificationType } from "@/lib/vendor/prisma/client"

export const ADMIN_NOTIFICATION_TYPES = [
  "product_upvote",
  "product_review",
  "reward_awarded",
  "system",
  "product_update",
] as const satisfies ReadonlyArray<NotificationType>

export type AdminNotificationTypeValue =
  (typeof ADMIN_NOTIFICATION_TYPES)[number]

export type AdminNotificationTypeFilter = AdminNotificationTypeValue | "all"

const ADMIN_NOTIFICATION_STATUS_FILTERS = ["all", "unread", "read"] as const

export type AdminNotificationStatusFilter =
  (typeof ADMIN_NOTIFICATION_STATUS_FILTERS)[number]

export const ADMIN_NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> =
  {
    product_upvote: "Product Upvote",
    product_review: "Product Review",
    reward_awarded: "Reward Awarded",
    system: "System",
    product_update: "Product Update",
  }

export const ADMIN_NOTIFICATION_TYPE_OPTIONS: ReadonlyArray<{
  value: AdminNotificationTypeFilter
  label: string
}> = [
  { value: "all", label: "All types" },
  ...ADMIN_NOTIFICATION_TYPES.map((type) => ({
    value: type,
    label: ADMIN_NOTIFICATION_TYPE_LABELS[type],
  })),
]

export const ADMIN_NOTIFICATION_STATUS_OPTIONS: ReadonlyArray<{
  value: AdminNotificationStatusFilter
  label: string
}> = [
  { value: "all", label: "All statuses" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
]

export function parseAdminNotificationStatusFilter(
  value: string | null | undefined,
): AdminNotificationStatusFilter {
  if (!value) return "all"
  const normalized = value as AdminNotificationStatusFilter
  return ADMIN_NOTIFICATION_STATUS_FILTERS.includes(normalized)
    ? normalized
    : "all"
}

export function parseAdminNotificationTypeFilter(
  value: string | null | undefined,
): AdminNotificationTypeFilter {
  if (!value || value === "all") {
    return "all"
  }

  const normalized = value as AdminNotificationTypeValue
  return ADMIN_NOTIFICATION_TYPES.includes(normalized) ? normalized : "all"
}
