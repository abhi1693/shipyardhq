import { normalizeAcquisitionContext } from "@/lib/analytics/acquisition"
import type { Prisma } from "@/lib/vendor/prisma/client"

export type LaunchLifecycleKind =
  "submission_started" | "submission_completed" | "first_published"

// Call inside the successful business transaction, never before validation or
// payment verification. A unique key makes retries and republication harmless.
export async function recordLaunchLifecycle(
  tx: Prisma.TransactionClient,
  input: {
    userId: string
    entityId: string
    kind: LaunchLifecycleKind
    at?: Date
  },
) {
  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { acquisitionContext: true },
  })
  const context = normalizeAcquisitionContext(user?.acquisitionContext)
  await tx.launchLifecycleEvent.createMany({
    data: [
      {
        key: `${input.kind}:${input.entityId}`,
        userId: input.userId,
        entityId: input.entityId,
        kind: input.kind,
        createdAt: input.at ?? new Date(),
        ...(context
          ? { acquisitionContext: context as unknown as Prisma.InputJsonValue }
          : {}),
      },
    ],
    skipDuplicates: true,
  })
}

export async function recordFirstPublication(
  tx: Prisma.TransactionClient,
  product: { id: string; userId: string; publishedAt: Date | null },
  at: Date,
) {
  // A legacy publication date is not evidence of a first publication *now*.
  // Older rows are reported separately, without manufacturing history.
  if (product.publishedAt) return
  const legacy = await tx.launchLifecycleEvent.findUnique({
    where: { key: `legacy_history_unknown:${product.id}` },
    select: { key: true },
  })
  if (legacy) return
  await recordLaunchLifecycle(tx, {
    userId: product.userId,
    entityId: product.id,
    kind: "first_published",
    at,
  })
}
