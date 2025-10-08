import { notFound } from "next/navigation"
import { Metadata } from "next"
import Link from "next/link"

import {
  getCategoryMeta,
  getCategoryWithProducts,
} from "@/actions/public/categories/actions"
import { getFeaturedByCategorySlug } from "@/actions/public/products/featured"
import FeaturedBanner from "@/components/molecules/FeaturedBanner"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { CategoryProductsClient } from "./client-products"
import { buildPageMetadata } from "@/lib/metadata"
import { productHasFeature } from "@/lib/features"
import { pluralize } from "@/lib/pluralize"
import { MEMBER_PRODUCTS_PATH, PRICING_PATH } from "@/lib/routes"
import { launchPrimaryButton, launchSecondaryButton } from "@/lib/ui/buttons"
import { brandGradient, gradientTint } from "@/lib/ui/tints"
import HeroStickyBanner from "@/components/layout/HeroStickyBanner"

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

type CategoryProduct = NonNullable<
  Awaited<ReturnType<typeof getCategoryWithProducts>>
>["products"][number]

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryMeta(slug)
  if (!category) return {}

  return buildPageMetadata({
    title: category.name,
    section: "Categories",
    description: category.description ?? undefined,
  })
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const [data, featured] = await Promise.all([
    getCategoryWithProducts(slug),
    getFeaturedByCategorySlug(slug, 7),
  ])

  if (!data) notFound()

  const { category, products } = data
  const totalProducts = products.length
  const totalFeatured = featured.length
  const priorityPlacements = products.filter((product) =>
    productHasFeature(product, "priorityPlacement"),
  )
  const totalPriority = priorityPlacements.length
  const totalUpvotes = products.reduce(
    (acc, product) => acc + (product.analytics?.upvotes ?? 0),
    0,
  )
  const averageUpvotes =
    totalProducts > 0 ? Math.round(totalUpvotes / totalProducts) : 0
  const latestLaunch = [...products]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .at(0)
  const latestLaunchDate = latestLaunch
    ? new Date(latestLaunch.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null
  const heroHighlights = [
    `${pluralize(totalProducts, "launch")} live`,
    totalFeatured > 0
      ? `${totalFeatured} featured spot${totalFeatured === 1 ? "" : "s"}`
      : "Feature your launch",
    totalPriority > 0
      ? `${totalPriority} premium placement${totalPriority === 1 ? "" : "s"}`
      : "Premium slots open",
  ]

  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-16">
          <section
            className={brandGradient(
              "rounded-3xl border border-[color:var(--brand-1)/0.18] px-6 py-12 text-white shadow-[0_28px_100px_-48px_rgba(18,66,112,0.65)] backdrop-blur md:px-10",
            )}
          >
            <div className="grid gap-10 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
              <div className="space-y-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                  <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/10 text-white shadow-[0_20px_46px_-32px_rgba(7,58,104,0.6)]">
                    <CategoryIcon
                      icon={category.icon}
                      size={28}
                      className="text-white"
                    />
                  </span>
                  <div className="space-y-5">
                    <span
                      className={gradientTint(
                        "inline-flex items-center gap-2 rounded-full px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/80",
                      )}
                    >
                      Category profile
                    </span>
                    <div className="space-y-3">
                      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        {category.name}
                      </h1>
                      {category.description ? (
                        <p className="max-w-2xl text-base text-white/85">
                          {category.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {heroHighlights.map((highlight) => (
                        <span
                          key={highlight}
                          className={gradientTint(
                            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.26em] text-white/80",
                          )}
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <Link
                    href={MEMBER_PRODUCTS_PATH}
                    className={launchPrimaryButton({ size: "lg" })}
                  >
                    Launch in this category
                  </Link>
                  <Link
                    href={PRICING_PATH}
                    className={launchSecondaryButton({
                      size: "lg",
                      className: "text-white/90 hover:text-white",
                    })}
                  >
                    Explore promotion tiers
                  </Link>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/25 bg-white/90 p-5 text-foreground shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Launches live
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {totalProducts.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pluralize(totalProducts, "launch")} currently charted in
                    this harbor.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/90 p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Featured momentum
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {totalFeatured.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {totalFeatured > 0
                      ? "Spotlights anchored this week."
                      : "Claim the next editorial spotlight."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/90 p-5 text-foreground shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Community signal
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {averageUpvotes.toLocaleString()} avg upvotes
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {latestLaunch
                      ? `Latest arrival ${latestLaunch.name} (${latestLaunchDate}).`
                      : "Be the first to launch and set the tone."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <HeroStickyBanner
            wrapperClassName="px-0"
            innerClassName="max-w-[120rem]"
          />

          {featured.length > 0 ? (
            <section className="rounded-3xl border border-border/60 bg-card/95 px-6 py-10 shadow-[0_24px_80px_-50px_rgba(7,58,104,0.5)] backdrop-blur md:px-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                    Featured in {category.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Spotlighted launches sailing ahead in this harbor.
                  </p>
                </div>
                <Link
                  href={PRICING_PATH}
                  className={launchSecondaryButton({
                    size: "sm",
                    className:
                      "text-[color:var(--brand-1)] hover:text-[color:var(--brand-1)]",
                  })}
                >
                  Get featured
                </Link>
              </div>
              <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
                <FeaturedBanner item={featured[0]} />
                {featured.length > 1 ? (
                  <FeaturedProductGrid
                    items={featured.slice(1)}
                    className="grid-cols-1"
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          <CategoryProductsClient
            products={products.map((p: CategoryProduct) => ({
              ...p,
              priority: productHasFeature(p, "priorityPlacement"),
              badges:
                p.ProductBadge?.filter(
                  (pb: CategoryProduct["ProductBadge"][number]) =>
                    !pb.expiresAt || new Date(pb.expiresAt) > new Date(),
                ).map(
                  (pb: CategoryProduct["ProductBadge"][number]) => pb.badge,
                ) ?? [],
            }))}
          />
        </div>
      </div>
    </main>
  )
}
