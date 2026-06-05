import { notFound } from "next/navigation"

import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { getCategoryDetailPayload } from "@/lib/categories/page-cache"
import { CategoryFeedClient } from "@/components/templates/public/categories/detail/CategoryFeedClient"
import {
  TaxonomyDetailPage,
  type TaxonomySponsorProduct,
} from "@/components/templates/public/common/TaxonomyDetailPage"
import {
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
} from "@/lib/routes"

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

function categoryDescription(name: string, description?: string | null) {
  if (description) return description

  return `Discover the newest ${name.toLowerCase()} products from makers shipping practical tools, launch experiments, and production-ready software.`
}

function toSponsorProduct(
  product:
    | { slug: string; name: string; tagline?: string | null }
    | null
    | undefined,
): TaxonomySponsorProduct | null {
  if (!product) return null

  return {
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
  }
}

export async function CategoryDetailPageContent({ params }: CategoryPageProps) {
  const { slug } = await params
  const data = await getCategoryDetailPayload(slug)

  if (!data) {
    notFound()
  }

  const { category, productsPage, featured, metrics } = data
  const initialPage = productsPage.nextPage ?? productsPage.page + 1
  const categorySlug = category.slug ?? slug
  const referenceDateIso = new Date().toISOString()
  const sponsorProduct =
    featured[0]?.product ?? productsPage.products[0] ?? null
  const secondarySponsor =
    featured[1]?.product ?? productsPage.products[1] ?? null

  return (
    <TaxonomyDetailPage
      title={category.name}
      description={categoryDescription(category.name, category.description)}
      icon={
        <CategoryIcon
          icon={category.icon}
          size={40}
          className="text-[#c0ff00]"
        />
      }
      primaryCta={{
        href: MEMBER_PRODUCTS_ADD_PATH,
        label: "Launch in this category",
      }}
      secondaryCta={{
        href: PRICING_PATH,
        label: "Explore promotion tiers",
      }}
      tertiaryCta={{
        href: `/trends/categories/${encodeURIComponent(categorySlug)}`,
        label: "Trending this week",
      }}
      stats={[
        { label: "Total Products", value: metrics.totalProducts },
        {
          label: "Featured",
          value: metrics.totalFeatured + metrics.totalPriority,
        },
        { label: "Upvotes", value: metrics.totalUpvotes },
      ]}
      feed={
        <CategoryFeedClient
          slug={categorySlug}
          initialProducts={productsPage.products}
          initialPage={initialPage}
          pageSize={productsPage.pageSize}
          referenceDateIso={referenceDateIso}
          initialHasMore={productsPage.hasMore}
        />
      }
      feedTestId="category-feed-section"
      sponsorProduct={toSponsorProduct(sponsorProduct)}
      secondarySponsor={toSponsorProduct(secondarySponsor)}
    />
  )
}
