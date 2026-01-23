import prisma from "@/lib/prisma"
import { buildVerifiedRevenueWhere } from "@/lib/products/verifiedRevenue"
import { getTrendingCategoryProductIds } from "@/lib/server/analytics/productInterest"

function formatOrdinal(value: number) {
  const n = Math.floor(value)
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const mod10 = n % 10
  if (mod10 === 1) return `${n}st`
  if (mod10 === 2) return `${n}nd`
  if (mod10 === 3) return `${n}rd`
  return `${n}th`
}

function average(values: number[]) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export async function getRevenueVerificationRankingNotice(args: {
  productId: string
}): Promise<string | null> {
  const productId = args.productId?.trim()
  if (!productId) return null

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      status: true,
      category: { select: { slug: true } },
    },
  })

  if (!product || product.status !== "published") return null
  const categorySlug = product.category?.slug ?? null
  if (!categorySlug) return null

  const hasVerifiedRevenue = await prisma.product
    .findFirst({
      where: {
        AND: [
          { id: productId, status: "published" as const },
          buildVerifiedRevenueWhere(),
        ],
      },
      select: { id: true },
    })
    .then(Boolean)
    .catch(() => false)

  if (hasVerifiedRevenue) return null

  const rankedIds = await getTrendingCategoryProductIds({
    categorySlug,
    days: 7,
    limit: 200,
  })

  if (!rankedIds.length) return null

  const productIndex = rankedIds.indexOf(productId)
  if (productIndex === -1) return null

  const verifiedRows = await prisma.product.findMany({
    where: {
      AND: [
        { id: { in: rankedIds }, status: "published" as const },
        { category: { is: { slug: categorySlug } } },
        buildVerifiedRevenueWhere(),
      ],
    },
    select: { id: true },
  })

  const verifiedIds = new Set(verifiedRows.map((row: { id: string }) => row.id))
  if (!verifiedIds.size || verifiedIds.size === rankedIds.length) return null

  const verifiedRanks: number[] = []
  const unverifiedRanks: number[] = []

  for (let i = 0; i < rankedIds.length; i += 1) {
    const rank = i + 1
    if (verifiedIds.has(rankedIds[i]!)) verifiedRanks.push(rank)
    else unverifiedRanks.push(rank)
  }

  const avgVerified = average(verifiedRanks)
  const avgUnverified = average(unverifiedRanks)
  if (!avgVerified || !avgUnverified || avgUnverified <= 0) return null

  const percentHigher = Math.round(
    ((avgUnverified - avgVerified) / avgUnverified) * 100,
  )

  if (!Number.isFinite(percentHigher) || percentHigher <= 0) return null

  const productRank = productIndex + 1
  return `Your product currently ranks ${formatOrdinal(
    productRank,
  )}. Revenue verified products in this category rank ${percentHigher} percent higher on average.`
}
