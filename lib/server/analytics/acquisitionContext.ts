import "server-only"
import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  ACQUISITION_COOKIE,
  normalizeAcquisitionContext,
  parseAcquisitionCookie,
  type AcquisitionContext,
} from "@/lib/analytics/acquisition"

export async function readAcquisitionContext() {
  try {
    return parseAcquisitionCookie(
      (await cookies()).get(ACQUISITION_COOKIE)?.value,
    )
  } catch {
    return undefined
  }
}

export async function saveUserAcquisition(
  userId: string,
  context?: AcquisitionContext,
) {
  const normalized = normalizeAcquisitionContext(context)
  if (!normalized) return undefined
  try {
    // One row update preserves the original first touch under concurrent visits.
    // This field never authorizes identity, ownership, roles or paid access.
    const serialized = JSON.stringify(normalized)
    const rows = await prisma.$queryRaw<
      { acquisitionContext: unknown }[]
    >(Prisma.sql`
      UPDATE "User"
      SET "acquisitionContext" = jsonb_set(${serialized}::jsonb, '{firstTouch}',
        COALESCE("acquisitionContext"->'firstTouch', ${serialized}::jsonb->'firstTouch'))
      WHERE id = ${userId}
      RETURNING "acquisitionContext"
    `)
    return (
      normalizeAcquisitionContext(rows[0]?.acquisitionContext) ?? normalized
    )
  } catch {
    // Measurement must not turn an otherwise successful auth/checkout into a failure.
    return normalized
  }
}
