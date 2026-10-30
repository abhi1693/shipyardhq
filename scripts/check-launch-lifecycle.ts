import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import prisma from "@/lib/prisma"
import {
  recordFirstPublication,
  recordLaunchLifecycle,
} from "@/lib/server/analytics/launchLifecycle"

async function main() {
  const url = new URL(
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  )
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/shipyard_issues"
  )
    throw new Error("Isolated local database required")
  const category = await prisma.category.findFirstOrThrow({
    select: { id: true },
  })
  const suffix = randomUUID()
  const user = await prisma.user.create({
    data: {
      clerkId: `lifecycle-${suffix}`,
      email: `lifecycle-${suffix}@example.invalid`,
      firstName: "Fixture",
      lastName: "Maker",
    },
  })
  let productId: string | undefined
  try {
    const product = await prisma.$transaction(async (tx) => {
      await recordLaunchLifecycle(tx, {
        userId: user.id,
        entityId: `draft-${suffix}`,
        kind: "submission_started",
      })
      const product = await tx.product.create({
        data: {
          name: "Lifecycle fixture",
          slug: `lifecycle-${suffix}`,
          tagline: "Synthetic fixture",
          description: "Local transaction validation",
          websiteUrl: `https://${suffix}.invalid`,
          logo: "/icon.svg",
          userId: user.id,
          categoryId: category.id,
          type: "saas",
          pricingModel: "free",
          status: "draft",
          keywords: [],
          platforms: ["web"],
        },
      })
      await recordLaunchLifecycle(tx, {
        userId: user.id,
        entityId: product.id,
        kind: "submission_completed",
      })
      return product
    })
    productId = product.id
    assert.equal(
      await prisma.launchLifecycleEvent.count({
        where: { userId: user.id, kind: "first_published" },
      }),
      0,
    )
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: product.id },
          data: { status: "published" },
        })
        await recordFirstPublication(tx, product, new Date())
        throw new Error("synthetic rollback")
      }),
    )
    assert.equal(
      await prisma.launchLifecycleEvent.count({
        where: { userId: user.id, kind: "first_published" },
      }),
      0,
    )
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
        .status,
      "draft",
    )
    const publicationAt = new Date()
    await Promise.all(
      Array.from({ length: 3 }, () =>
        prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: product.id },
            data: { status: "published", publishedAt: publicationAt },
          })
          await recordFirstPublication(tx, product, publicationAt)
        }),
      ),
    )
    const rows = await prisma.launchLifecycleEvent.findMany({
      where: { userId: user.id },
      orderBy: { kind: "asc" },
    })
    assert.equal(rows.length, 3)
    assert.equal(
      rows.find((row) => row.kind === "first_published")?.createdAt.getTime(),
      publicationAt.getTime(),
    )
    await prisma.product.delete({ where: { id: product.id } })
    productId = undefined
    assert.equal(
      await prisma.launchLifecycleEvent.count({ where: { userId: user.id } }),
      3,
    )
    await prisma.user.delete({ where: { id: user.id } })
    assert.equal(
      await prisma.launchLifecycleEvent.count({ where: { userId: user.id } }),
      0,
    )
    console.log(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          isolatedDatabase: true,
          privateSubmissionNotPublication: true,
          rollbackLeavesNoPublication: true,
          concurrentPublicationCount: 1,
          actualPublicationTime: true,
          productDeletionPreservesHistory: true,
          accountDeletionCascades: true,
          syntheticOperations: true,
        },
        null,
        2,
      ),
    )
  } finally {
    if (productId) await prisma.product.deleteMany({ where: { id: productId } })
    await prisma.user.deleteMany({ where: { id: user.id } })
  }
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Lifecycle validation failed",
    )
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
