import { cache } from "react"
import { auth } from "@clerk/nextjs/server"

import ProductUpvoteBadge from "@/components/molecules/ProductUpvoteBadge"
import ProductReviews from "@/components/organisms/ProductReviews"
import { ProductCard } from "@/components/molecules/ProductCard"
import { ProductUpdatesSection } from "@/components/templates/public/products/detail/product-updates-section"
import { toProductCardItem } from "@/lib/products/card-item"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { getPublicProductUpdates } from "@/actions/public/product-updates/actions"
import {
  getPublicProductsByUseCase,
  hasUserUpvoted,
} from "@/actions/public/products/actions"
import {
  getProductReviewSummary,
  getUserProductReview,
} from "@/lib/server/productReviews"

export type ViewerProductState = {
  isSignedIn: boolean
  viewerUpvoted: boolean
  viewerReview: { rating: number; message: string } | null
}

const getViewerProductState = cache(
  async (productId: string): Promise<ViewerProductState> => {
    const authResult = await auth()
    const clerkUserId = authResult?.userId ?? null
    if (!clerkUserId) {
      return { isSignedIn: false, viewerUpvoted: false, viewerReview: null }
    }

    const viewer = await getActiveUserByClerkId(clerkUserId).catch(() => null)
    if (!viewer) {
      return { isSignedIn: false, viewerUpvoted: false, viewerReview: null }
    }

    const [viewerUpvoted, viewerReview] = await Promise.all([
      hasUserUpvoted(productId, clerkUserId),
      getUserProductReview(productId, viewer.id).catch(() => null),
    ])

    return {
      isSignedIn: true,
      viewerUpvoted,
      viewerReview: viewerReview
        ? {
            rating: viewerReview.rating,
            message: viewerReview.message,
          }
        : null,
    }
  },
)

export async function ProductUpvoteBadgeServer({
  productId,
  productSlug,
  upvoteCount,
}: {
  productId: string
  productSlug: string
  upvoteCount: number
}) {
  const { viewerUpvoted } = await getViewerProductState(productId)
  return (
    <ProductUpvoteBadge
      productSlug={productSlug}
      count={upvoteCount}
      initialUpvoted={viewerUpvoted}
    />
  )
}

export async function ProductReviewsServer({
  productId,
  productName,
  redirectUrl,
}: {
  productId: string
  productName: string
  redirectUrl: string
}) {
  const reviewSummary = await getProductReviewSummary(productId, 6)
  const { isSignedIn, viewerReview } = await getViewerProductState(productId)

  return (
    <ProductReviews
      productId={productId}
      productName={productName}
      reviewSummary={reviewSummary}
      viewerReview={viewerReview}
      isSignedIn={isSignedIn}
      redirectUrl={redirectUrl}
    />
  )
}

export async function ProductUpdatesServer({
  productId,
  productSlug,
}: {
  productId: string
  productSlug: string
}) {
  const updates = await getPublicProductUpdates(productId)
  if (!updates.length) return null

  return <ProductUpdatesSection updates={updates} productSlug={productSlug} />
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
