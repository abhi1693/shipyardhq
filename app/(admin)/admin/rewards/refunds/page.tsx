import { buildPageMetadata } from "@/lib/metadata"
import prisma from "@/lib/prisma"
import { RedemptionStatus } from "@/lib/vendor/prisma/client"

import RefundRedemptionForm from "@/components/pages/admin/rewards/RefundRedemptionForm"

export const metadata = buildPageMetadata({
  title: "Refund redemptions",
  section: "Admin",
  description: "Issue reward refunds back to members.",
})

const REFUNDABLE_STATUSES: RedemptionStatus[] = [
  RedemptionStatus.pending,
  RedemptionStatus.active,
  RedemptionStatus.expired,
  RedemptionStatus.canceled,
  RedemptionStatus.failed,
]

export default async function RefundRedemptionsPage() {
  const redemptions = await prisma.redemption.findMany({
    where: {
      status: { in: REFUNDABLE_STATUSES },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      catalogItem: {
        select: {
          featureKey: true,
          name: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  const refundable = redemptions
    .map((redemption) => {
      const remainingAmount = redemption.cost - redemption.refundedRewards
      if (remainingAmount <= 0) {
        return null
      }
      return {
        id: redemption.id,
        user: redemption.user,
        featureKey: redemption.catalogItem.featureKey,
        rewardName: redemption.catalogItem.name,
        status: redemption.status,
        cost: redemption.cost,
        refundedRewards: redemption.refundedRewards,
        createdAt: redemption.createdAt.toISOString(),
        productName: redemption.product?.name ?? null,
        remainingAmount,
      }
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))

  return <RefundRedemptionForm redemptions={refundable} />
}
