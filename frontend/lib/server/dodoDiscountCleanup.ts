import { dodoClient } from "@/lib/dodo"

import type { Discount } from "dodopayments/resources/discounts"

export type DodoDiscountCleanupResult = {
  scanned: number
  eligible: number
  deleted: Array<Pick<Discount, "discount_id" | "code" | "expires_at">>
  failed: Array<{
    discount: Pick<Discount, "discount_id" | "code" | "expires_at">
    error: string
  }>
  dryRun: boolean
}

const DEFAULT_PAGE_SIZE = 100
const DEFAULT_MAX_DELETES = 500

function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

export async function cleanupExpiredUnusedDodoDiscounts(args?: {
  now?: Date
  dryRun?: boolean
  pageSize?: number
  maxDeletes?: number
}): Promise<DodoDiscountCleanupResult> {
  const now = args?.now ?? new Date()
  const dryRun = args?.dryRun ?? false

  const envPageSize = parsePositiveInt(
    process.env.DODO_DISCOUNT_CLEANUP_PAGE_SIZE,
  )
  const envMaxDeletes = parsePositiveInt(
    process.env.DODO_DISCOUNT_CLEANUP_MAX_DELETES,
  )

  const pageSize = Math.min(
    args?.pageSize ?? envPageSize ?? DEFAULT_PAGE_SIZE,
    200,
  )
  const maxDeletes = Math.min(
    args?.maxDeletes ?? envMaxDeletes ?? DEFAULT_MAX_DELETES,
    5000,
  )

  const result: DodoDiscountCleanupResult = {
    scanned: 0,
    eligible: 0,
    deleted: [],
    failed: [],
    dryRun,
  }

  for await (const discount of dodoClient.discounts.list({
    page_size: pageSize,
  })) {
    result.scanned += 1

    if (discount.times_used !== 0) continue
    const expiresAt = parseIsoDate(discount.expires_at ?? null)
    if (!expiresAt) continue
    if (expiresAt.getTime() > now.getTime()) continue

    result.eligible += 1
    if (result.deleted.length >= maxDeletes) continue

    const snapshot = {
      discount_id: discount.discount_id,
      code: discount.code,
      expires_at: discount.expires_at ?? null,
    } satisfies Pick<Discount, "discount_id" | "code" | "expires_at">

    if (dryRun) {
      result.deleted.push(snapshot)
      continue
    }

    try {
      await dodoClient.discounts.delete(discount.discount_id)
      result.deleted.push(snapshot)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      result.failed.push({ discount: snapshot, error: message })
    }
  }

  return result
}
