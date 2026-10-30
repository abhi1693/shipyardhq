import "server-only"
import { createHash } from "node:crypto"
import prisma from "@/lib/prisma"
import { IS_PROD } from "@/lib/constants"
import {
  acquisitionEventParams,
  normalizeAcquisitionContext,
  type AcquisitionContext,
} from "@/lib/analytics/acquisition"
import type { Prisma } from "@/lib/vendor/prisma/client"

export async function sendAttributedGaEvent(input: {
  key: string
  userId: string
  name: string
  context?: AcquisitionContext
  params: Record<string, unknown>
}) {
  const measurementId = process.env.GOOGLE_ANALYTICS_ID?.trim()
  const secret = process.env.GOOGLE_ANALYTICS_API_SECRET?.trim()
  const context = normalizeAcquisitionContext(input.context)
  if (!measurementId || !secret || !context?.clientId || !input.userId)
    return "unknown" as const
  const debug = !IS_PROD || process.env.GOOGLE_ANALYTICS_DEBUG === "true"
  const payload = {
    client_id: context.clientId,
    ...(debug ? { validation_behavior: "ENFORCE_RECOMMENDATIONS" } : {}),
    events: [
      {
        name: input.name,
        params: {
          ...input.params,
          ...acquisitionEventParams(context),
          event_id: createHash("sha256").update(input.key).digest("hex"),
        },
      },
    ],
  }
  try {
    await prisma.analyticsConversion.create({
      data: {
        key: input.key,
        userId: input.userId,
        eventName: input.name,
        payload: payload as Prisma.InputJsonValue,
        status: "attempting",
      },
    })
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    )
      return "duplicate" as const
    return "unavailable" as const
  }
  let status = "unknown_delivery"
  try {
    const response = await fetch(
      `https://www.google-analytics.com/${debug ? "debug/" : ""}mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(secret)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!response.ok) status = "rejected"
    else if (debug) {
      const validation = (await response.json()) as {
        validationMessages?: unknown[]
      }
      status =
        Array.isArray(validation.validationMessages) &&
        validation.validationMessages.length === 0
          ? "validated"
          : "rejected"
    } else status = "sent"
  } catch {
    /* Delivery may be ambiguous; do not automatically send a second conversion. */
  }
  try {
    await prisma.analyticsConversion.update({
      where: { key: input.key },
      data: { status },
    })
  } catch {
    /* The durable claim already prevents duplicate sends. */
  }
  return status
}
