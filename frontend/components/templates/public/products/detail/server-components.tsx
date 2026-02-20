import { cache } from "react"
import { auth } from "@clerk/nextjs/server"

import ProductUpvoteBadge from "@/components/molecules/ProductUpvoteBadge"
import { ProductCard } from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import {
  getPublicProductUpvoteStatusServer,
  getPublicProductsByUseCaseServer,
} from "@/lib/server/generated-public"

export type ViewerProductState = {
  viewerUpvoted: boolean
}

const getViewerProductState = cache(
  async (productId: string): Promise<ViewerProductState> => {
    const authResult = await auth()
    if (!authResult?.userId) {
      return { viewerUpvoted: false }
    }

    let authToken: string | null = null
    try {
      authToken = await authResult.getToken()
    } catch {
      authToken = null
    }
    if (!authToken) {
      return { viewerUpvoted: false }
    }

    const upvoteState = await getPublicProductUpvoteStatusServer(
      productId,
      authToken,
    ).catch(() => null)

    return { viewerUpvoted: upvoteState?.upvoted ?? false }
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
  const similarProducts = await getPublicProductsByUseCaseServer(
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
      interest: item.interest ?? null,
      category: item.category ?? undefined,
      badges: item.badges ?? [],
      sponsored: item.sponsored ?? false,
      scoreCount: item.scoreCount ?? undefined,
      latestRevenueCents: item.latestRevenueCents ?? undefined,
      revenueCurrencyCode: item.revenueCurrencyCode ?? undefined,
      isVerified: item.isVerified ?? false,
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
