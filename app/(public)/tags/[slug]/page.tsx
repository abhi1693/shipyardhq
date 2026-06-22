import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Hash } from "lucide-react"

import { formatTagLabel } from "@/app/(public)/tags/_utils"
import {
  getKeywordTagProducts,
  getKeywordTagSummaries,
} from "@/actions/public/tags/actions"
import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { TaxonomyDetailPage } from "@/components/templates/public/common/TaxonomyDetailPage"
import { TaxonomyTrafficStatsSidebar } from "@/components/templates/public/common/TaxonomyTrafficStatsSidebar"
import { getTaxonomySponsorProducts } from "@/components/templates/public/common/taxonomy-sponsors"
import {
  buildTaxonomyProductSections,
  TaxonomyProductSections,
} from "@/components/templates/public/common/TaxonomyProductRows"
import {
  BROWSE_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  tagPath,
} from "@/lib/routes"
import { buildPageMetadata } from "@/lib/metadata"
import { getTagDetailPayload } from "@/lib/tags/page-cache"
import { toProductCardItem } from "@/lib/products/card-item"
import { hasEditorPickBadge } from "@/lib/products/badges"
import { stripLegacyKeywordHash } from "@/lib/tags"
import type { ProductCardItem } from "@/components/molecules/ProductCard"
import { stableUnitInterval } from "@/lib/stable-random"

export async function generateStaticParams() {
  const tags = await getKeywordTagSummaries()

  return tags.map((tag) => ({
    slug: tag.slug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const canonicalSlug = stripLegacyKeywordHash(slug) || slug
  const label = formatTagLabel(canonicalSlug)
  return buildPageMetadata({
    title: `${label} Tag`,
    description: `Discover Shipyard products tagged with “${label}”. Browse the latest launches and tools connected to this keyword.`,
    section: "Tags",
    canonical: tagPath(canonicalSlug),
  })
}

interface TagPageProps {
  params: Promise<{ slug: string }>
}

const FALLBACK_TAGLINE =
  "Discover launch-ready tools from indie makers worldwide."

function mapProductCardItemToFeedItem(
  product: ProductCardItem,
): HomepageFeedItem {
  const resolveCategoryName = () => {
    if (typeof product.categoryName !== "undefined") {
      return product.categoryName ?? null
    }
    return product.category?.name ?? null
  }

  const resolveCategorySlug = () => {
    if (typeof product.categorySlug !== "undefined") {
      return product.categorySlug ?? null
    }
    return product.category?.slug ?? null
  }

  const isPriorityPlacement =
    typeof product.isSponsored !== "undefined"
      ? product.isSponsored
      : Boolean(product.sponsored)
  const isEditorPick = hasEditorPickBadge(product.badges ?? [])
  const isSponsored = isPriorityPlacement || isEditorPick

  const variant =
    typeof product.variant !== "undefined"
      ? product.variant
      : isPriorityPlacement
        ? "sponsored"
        : isEditorPick
          ? "promoted"
          : "default"

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline || FALLBACK_TAGLINE,
    createdAt: product.createdAt ?? "",
    updatedAt: product.updatedAt ?? "",
    badges: product.badges ?? [],
    category: resolveCategoryName(),
    categorySlug: resolveCategorySlug(),
    upvoteCount: product.analytics?.upvotes ?? 0,
    scoreCount:
      typeof product.scoreCount === "number" ? product.scoreCount : undefined,
    updatesCount: product.updatesCount,
    isSponsored,
    isVoted: Boolean(product.isVoted),
    isVerified: Boolean(product.isVerified),
    variant,
    shuffleRank: stableUnitInterval(`tag-feed:${product.id}:${product.slug}`),
  }
}

const MAX_TAG_PAGES = 50

function resolveReferenceDateIso(
  items: HomepageFeedItem[],
  fallback?: Date | null,
) {
  for (const item of items) {
    const parsed = new Date(item.publishedAt ?? item.createdAt ?? "")
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }

  return fallback && !Number.isNaN(fallback.getTime())
    ? fallback.toISOString()
    : null
}

export default function TagDetailPage(props: TagPageProps) {
  return (
    <Suspense fallback={null}>
      <TagDetailPageContent {...props} />
    </Suspense>
  )
}

async function TagDetailPageContent({ params }: TagPageProps) {
  const { slug } = await params

  const [payload, taxonomySponsors] = await Promise.all([
    getTagDetailPayload(slug, 1),
    getTaxonomySponsorProducts(),
  ])
  if (!payload) {
    redirect("/tags")
  }

  const { summary, products } = payload
  if (summary.slug !== slug) {
    redirect(tagPath(summary.slug))
  }

  const tagLabel = formatTagLabel(summary.canonical || summary.keyword)
  const totalTaggedProducts = summary.productCount

  const collectedProducts = [...products.products]
  let hasMore = products.hasMore
  let page = 2

  while (hasMore && page <= MAX_TAG_PAGES) {
    const nextPage = await getKeywordTagProducts(summary.slug, page)
    if (!nextPage) {
      break
    }

    collectedProducts.push(...nextPage.products)

    const expectedTotal = nextPage.total ?? totalTaggedProducts
    hasMore = nextPage.hasMore && collectedProducts.length < expectedTotal
    page += 1
  }

  const tagProductItems = collectedProducts.map((product) =>
    toProductCardItem(product),
  )
  const tagProductIdSet = new Set(tagProductItems.map((item) => item.id))

  const combinedFeedItems = tagProductItems
    .map((item) => mapProductCardItemToFeedItem(item))
    .sort((a, b) => {
      const aTime = new Date(a.createdAt ?? "").getTime()
      const bTime = new Date(b.createdAt ?? "").getTime()
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
      if (Number.isNaN(aTime)) return 1
      if (Number.isNaN(bTime)) return -1
      return bTime - aTime
    })
  const referenceDateIso = resolveReferenceDateIso(
    combinedFeedItems,
    summary.lastUpdated,
  )

  const taggedCount = tagProductIdSet.size
  const feedSections = referenceDateIso
    ? buildTaxonomyProductSections(combinedFeedItems, referenceDateIso)
    : []

  return (
    <TaxonomyDetailPage
      title={tagLabel}
      description={`Explore launches using the “${tagLabel}” keyword.`}
      icon={<Hash className="h-10 w-10 text-[#c0ff00]" aria-hidden />}
      primaryCta={{
        href: MEMBER_PRODUCTS_ADD_PATH,
        label: "Launch with this keyword",
      }}
      secondaryCta={{
        href: PRICING_PATH,
        label: "Explore promotion tiers",
      }}
      tertiaryCta={{
        href: `${BROWSE_PATH}?tag=${encodeURIComponent(summary.slug)}`,
        label: "Trending this week",
      }}
      stats={[
        { label: "Total Products", value: totalTaggedProducts },
        { label: "Tagged", value: taggedCount },
        { label: "Launches", value: combinedFeedItems.length },
      ]}
      feed={
        <div className="space-y-6">
          <h2 className="sr-only">Tag feed</h2>
          {combinedFeedItems.length > 0 ? (
            <TaxonomyProductSections sections={feedSections} />
          ) : (
            <div className="rounded-lg border border-[#e2e8f0] bg-white p-8 text-center text-sm text-[#43474c]">
              No launches use this keyword yet. Check back soon.
            </div>
          )}
          {taggedCount > 0 ? (
            <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
              Showing {new Intl.NumberFormat().format(taggedCount)} tagged
              product{taggedCount === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      }
      feedTestId="tag-feed-section"
      sponsorProducts={taxonomySponsors}
      trafficStats={<TaxonomyTrafficStatsSidebar />}
    />
  )
}
