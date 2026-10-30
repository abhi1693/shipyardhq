import { randomUUID } from "node:crypto"
import prisma from "@/lib/prisma"
import { saveUserAcquisition } from "@/lib/server/analytics/acquisitionContext"
import { sendAttributedGaEvent } from "@/lib/server/analytics/attributedEvents"
import type { AcquisitionContext } from "@/lib/analytics/acquisition"

async function main() {
  const database = new URL(
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  )
  if (
    !["127.0.0.1", "localhost"].includes(database.hostname) ||
    database.pathname !== "/shipyard_issues"
  )
    throw new Error("Use the isolated local shipyard_issues database")
  process.env.GOOGLE_ANALYTICS_ID = "G-VALIDATION"
  process.env.GOOGLE_ANALYTICS_API_SECRET = "validation-only"
  process.env.GOOGLE_ANALYTICS_DEBUG = "true"
  const suffix = randomUUID()
  const before = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
  }
  const user = await prisma.user.create({
    data: {
      clerkId: `fixture-${suffix}`,
      email: `fixture-${suffix}@example.invalid`,
      firstName: "Fixture",
      lastName: "Maker",
    },
  })
  const key = `signup:${user.id}`
  const context: AcquisitionContext = {
    version: 1,
    firstTouch: {
      path: "/guides/product-launch-checklist",
      source: "google",
      medium: "organic",
      observedAt: Date.now(),
    },
    conversionVisit: {
      path: "/pricing",
      source: "newsletter",
      medium: "email",
      observedAt: Date.now(),
    },
    clientId: "123456789.987654321",
    sessionId: String(Math.floor(Date.now() / 1000)),
    idsObservedAt: Date.now(),
  }
  try {
    await saveUserAcquisition(user.id, context)
    const snapshots = await Promise.all(
      ["newsletter", "betalist"].map((source) =>
        saveUserAcquisition(user.id, {
          ...context,
          firstTouch: { ...context.firstTouch, source },
        }),
      ),
    )
    if (
      !snapshots.every((snapshot) => snapshot?.firstTouch.source === "google")
    )
      throw new Error("First touch changed")
    const request = {
      key,
      userId: user.id,
      name: "sign_up",
      context,
      params: { method: "account" },
    }
    const results = await Promise.all([
      sendAttributedGaEvent(request),
      sendAttributedGaEvent(request),
    ])
    if (!results.includes("validated") || !results.includes("duplicate"))
      throw new Error("Conversion claim or validation failed")
    const row = await prisma.analyticsConversion.findUniqueOrThrow({
      where: { key },
    })
    const payload = row.payload as {
      client_id?: string
      events?: { params?: { session_id?: number } }[]
    }
    if (
      payload.client_id !== context.clientId ||
      payload.events?.[0]?.params?.session_id !== Number(context.sessionId)
    )
      throw new Error("Browser identity was lost")
    await prisma.user.delete({ where: { id: user.id } })
    if (await prisma.analyticsConversion.count({ where: { key } }))
      throw new Error("Account cleanup did not remove its conversion")
    const after = {
      users: await prisma.user.count(),
      products: await prisma.product.count(),
    }
    if (JSON.stringify(before) !== JSON.stringify(after))
      throw new Error("Business record counts changed")
    console.log(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          isolatedDatabase: true,
          syntheticContext: true,
          firstTouchPreservedUnderConcurrentUpdates: true,
          duplicateResults: results.sort(),
          sameClientId: true,
          sameSessionId: true,
          accountDeletionCascades: true,
          businessCountsUnchanged: true,
          note: "Uses Google's non-recording debug endpoint; does not certify a production property or a real auth/payment journey.",
        },
        null,
        2,
      ),
    )
  } finally {
    await prisma.user.deleteMany({ where: { id: user.id } })
  }
}
main()
  .catch(() => {
    console.error(
      "Acquisition ledger check failed; no successful validation is claimed.",
    )
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
