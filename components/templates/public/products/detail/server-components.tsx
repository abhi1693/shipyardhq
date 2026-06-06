import { cache } from "react"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { Rocket } from "lucide-react"

import { Image } from "@/components/atoms/image"
import ProductUpvoteBadge from "@/components/molecules/ProductUpvoteBadge"
import { ProductCard } from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"
import { getSponsoredProducts } from "@/actions/public/products/featured"
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
  variant,
}: {
  productId: string
  productSlug: string
  upvoteCount: number
  leaderboard?: {
    points: number
    rank: number | null
    available: boolean
  }
  variant?: "card" | "inline"
}) {
  const { viewerUpvoted } = await getViewerProductState(productId)
  return (
    <ProductUpvoteBadge
      productSlug={productSlug}
      count={upvoteCount}
      initialUpvoted={viewerUpvoted}
      leaderboard={leaderboard}
      variant={variant}
    />
  )
}

export async function SimilarProductsServer({
  productId,
  useCaseSlug,
  variant = "card",
}: {
  productId: string
  useCaseSlug: string
  variant?: "card" | "compact"
}) {
  if (!useCaseSlug) return null
  const similarProducts = await getPublicProductsByUseCase(
    useCaseSlug,
    productId,
    4,
  )
  if (!similarProducts.length) return null

  const interestMap = await getProductInterestSignalsMap({
    products: similarProducts.map((product) => ({
      id: product.id,
      slug: product.slug,
    })),
  })

  const cardItems = similarProducts.map((item) =>
    toProductCardItem({
      id: item.id,
      slug: item.slug,
      name: item.name,
      logo: item.logo ?? "",
      tagline: item.tagline ?? "",
      interest: interestMap.get(item.id) ?? null,
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

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        {cardItems.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.slug}`}
            className="group flex items-center gap-3 rounded-lg border border-transparent bg-white p-2 transition hover:border-border hover:bg-muted/30"
          >
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
              {item.logo ? (
                <Image
                  src={item.logo}
                  alt={`${item.name} logo`}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">
                  {item.name.slice(0, 2)}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground group-hover:text-[#0051d5]">
                {item.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {item.tagline}
              </span>
            </span>
            <span className="text-xs font-semibold text-foreground">
              {item.analytics?.upvotes ?? 0}
            </span>
          </Link>
        ))}
      </div>
    )
  }

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

export async function DetailSponsoredProductCard({
  currentProductSlug,
}: {
  currentProductSlug: string
}) {
  const placements = await getSponsoredProducts(12)
  const placement =
    placements.find((item) => item.product.slug !== currentProductSlug) ??
    placements[0] ??
    null

  if (!placement) return null

  const product = placement.product
  const tagline = product.tagline?.trim()

  return (
    <section className="relative overflow-hidden rounded-xl bg-[#061d31] p-6 text-white">
      <div className="absolute right-2 top-2 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase">
        Sponsored
      </div>
      <div className="relative z-10">
        <div className="mb-3 flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white/10 text-[#c0ff00]">
          {product.logo ? (
            <Image
              src={product.logo}
              alt={`${product.name} logo`}
              width={36}
              height={36}
              sizes="36px"
              className="h-full w-full object-cover"
            />
          ) : (
            <Rocket className="h-5 w-5" aria-hidden fill="currentColor" />
          )}
        </div>
        <h2 className="mb-2 text-lg font-semibold">{product.name}</h2>
        {tagline ? (
          <p className="mb-4 text-sm text-[#b3c8e3]">{tagline}</p>
        ) : null}
        <a
          href={`/r/sponsored/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="inline-flex w-full items-center justify-center rounded bg-white px-4 py-2 text-xs font-semibold uppercase text-[#061d31] transition hover:bg-[#c0ff00]"
        >
          Learn more
        </a>
      </div>
      <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#346cef]/30 blur-3xl" />
    </section>
  )
}
