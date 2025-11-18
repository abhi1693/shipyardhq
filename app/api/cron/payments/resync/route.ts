import { NextResponse } from "next/server"

import prisma from "@/lib/prisma"
import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { dispatchEvent } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import {
  PaymentConnectorStatus,
  PaymentCredentialStatus,
} from "@/lib/vendor/prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MIN_INTERVAL_MINUTES = 24 * 60 // 1 day
const DEFAULT_INTERVAL_MINUTES = MIN_INTERVAL_MINUTES

function getIntervalMinutes() {
  const raw = process.env.PAYMENT_CONNECTOR_RESYNC_MINUTES?.trim()
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_INTERVAL_MINUTES
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_INTERVAL_MINUTES
  return Math.max(parsed, MIN_INTERVAL_MINUTES)
}

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const searchParams = new URL(request.url).searchParams
  const targetProductId = searchParams.get("productId") || undefined
  const targetConnectorId = searchParams.get("connectorId") || undefined
  const force =
    (searchParams.get("force") || "").toLowerCase() === "true" ||
    searchParams.get("force") === "1"

  const intervalMinutes = getIntervalMinutes()
  const staleBefore = new Date(Date.now() - intervalMinutes * 60 * 1000)
  const staleCondition = {
    OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: staleBefore } }],
  }

  const connectors = await prisma.paymentConnector.findMany({
    where: {
      ...(targetConnectorId ? { id: targetConnectorId } : {}),
      ...(targetProductId ? { productId: targetProductId } : {}),
      status: {
        in: [PaymentConnectorStatus.active, PaymentConnectorStatus.error],
      },
      credentials: { some: { status: PaymentCredentialStatus.active } },
      ...(force
        ? {}
        : {
            AND: [
              staleCondition,
              {
                OR: [
                  { revenueHistory: { some: {} } },
                  {
                    // Only treat missing revenue as a reason to resync when also stale.
                    AND: [{ revenueHistory: { none: {} } }, staleCondition],
                  },
                ],
              },
            ],
          }),
    },
    select: {
      id: true,
      productId: true,
      provider: true,
      lastSyncedAt: true,
    },
  })

  let enqueued = 0
  for (const connector of connectors) {
    await dispatchEvent(APP_EVENTS.PAYMENTS_CONNECTOR_SYNC, {
      connectorId: connector.id,
    })
    enqueued += 1
  }

  console.info("[cron.payments:resync] dispatched", {
    enqueued,
    intervalMinutes,
    force,
    connectorIds: connectors.map((connector) => connector.id),
  })

  return NextResponse.json({
    success: true,
    enqueued,
    intervalMinutes,
    force,
  })
}
