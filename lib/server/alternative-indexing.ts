import prisma from "@/lib/prisma"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getReviewedLaunchChannels } from "@/lib/launch-channels/catalog"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import { isAlternativeIndexable } from "@/lib/seo/alternative-eligibility"

/** One eligible population feeds totals and shards, before pagination. The
 * alternative catalog is small; fetch counts once rather than filtering each
 * shard after pagination (which creates holes and inaccurate shard totals).
 */
export async function getIndexableAlternativeRecords() {
  "use cache"
  applyCache([TAGS.alternativeProducts, TAGS.products], DEFAULT_TTL.slowest)
  const alternatives = await prisma.alternativeProduct.findMany({
    select: {
      slug: true,
      updatedAt: true,
      createdAt: true,
      _count: {
        select: { products: { where: buildPublicDiscoveryProductWhere() } },
      },
    },
  })
  const records = alternatives
    .filter((record) =>
      isAlternativeIndexable(record.slug, record._count.products),
    )
    .map(({ slug, updatedAt, createdAt }) => ({ slug, updatedAt, createdAt }))
  // The reviewed route exists without a maker-mapped database record.
  const reviewedAt = new Date(
    `${getReviewedLaunchChannels()
      .map((channel) => channel.verifiedAt)
      .sort()
      .at(-1)}T00:00:00Z`,
  )
  const existing = records.find((record) => record.slug === "product-hunt")
  if (existing) {
    if (existing.updatedAt < reviewedAt) existing.updatedAt = reviewedAt
  } else if (isAlternativeIndexable("product-hunt", 0)) {
    records.push({
      slug: "product-hunt",
      updatedAt: reviewedAt,
      createdAt: reviewedAt,
    })
  }
  return records.sort(
    (a, b) =>
      b.updatedAt.getTime() - a.updatedAt.getTime() ||
      a.slug.localeCompare(b.slug),
  )
}
