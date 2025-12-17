import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { cleanupExpiredUnusedDodoDiscounts } from "@/lib/server/dodoDiscountCleanup"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isTruthy(value: string | null) {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const searchParams = new URL(request.url).searchParams
  const dryRun = isTruthy(searchParams.get("dryRun"))
  const pageSize = parsePositiveInt(searchParams.get("pageSize"))
  const maxDeletes = parsePositiveInt(searchParams.get("maxDeletes"))

  try {
    console.info("[cron.dodo:discounts.cleanup] run started", {
      dryRun,
      pageSize,
      maxDeletes,
    })

    const result = await cleanupExpiredUnusedDodoDiscounts({
      dryRun,
      ...(pageSize ? { pageSize } : {}),
      ...(maxDeletes ? { maxDeletes } : {}),
    })

    console.info("[cron.dodo:discounts.cleanup] run completed", {
      scanned: result.scanned,
      eligible: result.eligible,
      deleted: result.deleted.length,
      failed: result.failed.length,
      dryRun: result.dryRun,
    })

    if (result.failed.length > 0 && !result.dryRun) {
      console.error("[cron.dodo:discounts.cleanup] partial failure", {
        failed: result.failed.slice(0, 25),
        failedCount: result.failed.length,
      })
      return NextResponse.json(
        { success: false, ...result },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[cron.dodo:discounts.cleanup] run failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed",
      },
      { status: 500 },
    )
  }
}

