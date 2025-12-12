import { cache } from "react"
import { auth } from "@clerk/nextjs/server"

import ProductUpvoteBadge from "@/components/molecules/ProductUpvoteBadge"
import { ProductCard } from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import {
  getPublicProductsByUseCase,
  hasUserUpvoted,
} from "@/actions/public/products/actions"

export type ViewerProductState = {
  viewerUpvoted: boolean
}

const getViewerProductState = cache(
  async (productId: string): Promise<ViewerProductState> => {
    const authResult = await auth()
    const clerkUserId = authResult?.userId ?? null
    if (!clerkUserId) {
      return { viewerUpvoted: false }
    }

    const viewer = await getActiveUserByClerkId(clerkUserId).catch(() => null)
    if (!viewer) {
      return { viewerUpvoted: false }
    }

    const viewerUpvoted = await hasUserUpvoted(productId, clerkUserId)

    return { viewerUpvoted }
  },
)

export async function ProductUpvoteBadgeServer({
  productId,
  productSlug,
  upvoteCount,
  leaderboard,
}: {
  productId: string
  productSlug: string
  upvoteCount: number
  leaderboard?: {
    points: number
    rank: number | null
    available: boolean
  }
}) {
  const { viewerUpvoted } = await getViewerProductState(productId)
  return (
    <ProductUpvoteBadge
      productSlug={productSlug}
      count={upvoteCount}
      initialUpvoted={viewerUpvoted}
      leaderboard={leaderboard}
    />
  )
}

export async function SimilarProductsServer({
  productId,
  useCaseSlug,
}: {
  productId: string
  useCaseSlug: string
}) {
  if (!useCaseSlug) return null
  const similarProducts = await getPublicProductsByUseCase(
    useCaseSlug,
    productId,
    4,
  )
  if (!similarProducts.length) return null

  const cardItems = similarProducts.map((item) =>
    toProductCardItem({
      id: item.id,
      slug: item.slug,
      name: item.name,
      logo: item.logo ?? "",
      tagline: item.tagline ?? "",
      analytics: item.analytics
        ? { upvotes: item.analytics.upvotes ?? 0 }
        : undefined,
      category: item.category
        ? {
            name: item.category.name ?? null,
            slug: item.category.slug ?? null,
          }
        : undefined,
      isVerified: item.verification?.isVerified ?? false,
    }),
  )

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        You may also like
      </h2>
      <div className="space-y-3">
        {cardItems.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </section>
  )
}
