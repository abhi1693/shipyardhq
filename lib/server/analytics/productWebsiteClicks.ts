import prisma from "@/lib/prisma"

export async function recordProductWebsiteClick(productId: string) {
  return prisma.productAnalytics.upsert({
    where: { productId },
    create: {
      productId,
      websiteClicks: 1,
    },
    update: {
      websiteClicks: { increment: 1 },
    },
    select: { websiteClicks: true },
  })
}
