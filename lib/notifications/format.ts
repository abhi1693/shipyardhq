import type {
  NotificationItem,
  NotificationMetadata,
} from "@/types/notifications"
import type { NotificationType } from "@/lib/vendor/prisma/client"

export type NotificationContextChip = {
  label: string
  value: string
  href?: string
}

export type NotificationPresentation = {
  chips: NotificationContextChip[]
  primaryHref: string | null
  metadata: Record<string, unknown>
}

const TYPE_META: Record<
  NotificationType,
  { label: string; className: string }
> = {
  product_upvote: {
    label: "Upvote",
    className:
      "border-sky-500/40 bg-sky-50 text-sky-700 dark:bg-sky-500/10",
  },
  product_review: {
    label: "Review",
    className:
      "border-amber-500/45 bg-amber-50 text-amber-700 dark:bg-amber-500/10",
  },
  reward_awarded: {
    label: "Reward",
    className:
      "border-emerald-500/45 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10",
  },
  system: {
    label: "System",
    className:
      "border-slate-400/45 bg-slate-100 text-slate-700 dark:bg-slate-500/10",
  },
}

export function getTypePresentation(type: NotificationType) {
  return TYPE_META[type] ?? TYPE_META.system
}

export function buildNotificationPresentation(
  notification: NotificationItem,
): NotificationPresentation {
  const metadata = toMetadataRecord(notification.metadata)
  const primaryHref = resolvePrimaryHref(metadata)
  const chips: NotificationContextChip[] = []

  const productName = getString(metadata.productName)
  const productHref = primaryHref ?? getString(metadata.publicHref)

  switch (notification.type) {
    case "product_upvote": {
      if (productName) {
        chips.push({
          label: "Product",
          value: productName,
          href: productHref ?? undefined,
        })
      }

      const actorName = getString(metadata.actorName)
      if (actorName) {
        chips.push({ label: "Upvoter", value: actorName })
      }
      break
    }

    case "product_review": {
      if (productName) {
        chips.push({
          label: "Product",
          value: productName,
          href: productHref ?? undefined,
        })
      }

      const reviewerName = getString(metadata.reviewerName)
      if (reviewerName) {
        chips.push({ label: "Reviewer", value: reviewerName })
      }

      const rating = getNumber(metadata.rating)
      if (typeof rating === "number") {
        chips.push({ label: "Rating", value: `${rating}/5` })
      }
      break
    }

    case "reward_awarded": {
      const rewardAmount = getNumber(metadata.rewardAmount)
      if (typeof rewardAmount === "number") {
        chips.push({
          label: "Points",
          value: rewardAmount.toLocaleString("en-US"),
        })
      }

      const ruleName = getString(metadata.ruleName)
      if (ruleName) {
        chips.push({ label: "Rule", value: ruleName })
      }

      if (productName) {
        chips.push({
          label: "Product",
          value: productName,
          href: productHref ?? undefined,
        })
      }
      break
    }

    default: {
      if (productName) {
        chips.push({
          label: "Product",
          value: productName,
          href: productHref ?? undefined,
        })
      }
      break
    }
  }

  if (chips.length === 0 && productName) {
    chips.push({ label: "Product", value: productName })
  }

  return {
    chips,
    primaryHref,
    metadata,
  }
}

function toMetadataRecord(
  metadata: NotificationMetadata,
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") return {}
  if (Array.isArray(metadata)) return {}
  return metadata as Record<string, unknown>
}

function resolvePrimaryHref(
  metadata: Record<string, unknown>,
): string | null {
  const href = getString(metadata.href)
  if (href) return href
  const publicHref = getString(metadata.publicHref)
  return publicHref ?? null
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getNumber(value: unknown): number | null {
  if (typeof value !== "number") return null
  return Number.isFinite(value) ? value : null
}
