import type { NotificationItem } from "@/types/notifications"

export type NotificationPresentation = {
  primaryHref: string | null
  metadata: Record<string, unknown>
}

export function buildNotificationPresentation(
  notification: NotificationItem,
): NotificationPresentation {
  const metadata = toMetadataRecord(notification.metadata)
  const primaryHref = resolvePrimaryHref(metadata)
  return {
    primaryHref,
    metadata,
  }
}

function toMetadataRecord(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") return {}
  if (Array.isArray(metadata)) return {}
  return metadata as Record<string, unknown>
}

function resolvePrimaryHref(metadata: Record<string, unknown>): string | null {
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
