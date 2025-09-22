import { notFound } from "next/navigation"
import { Metadata } from "next"
import Link from "next/link"
import {
  getCategoryMeta,
  getCategoryWithProducts,
} from "@/actions/public/categories/actions"
import { Badge } from "@/components/atoms/badge"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import PublicContainer from "@/components/layout/PublicContainer"
import { CategoryProductsClient } from "./client-products"
import { getFeaturedByCategorySlug } from "@/actions/public/products/featured"
import { productHasFeature } from "@/lib/features"
import { Button } from "@/components/atoms/button"
import FeaturedBanner from "@/components/molecules/FeaturedBanner"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"
import { buildPageMetadata } from "@/lib/metadata"
import { MEMBER_PRODUCTS_PATH, PRICING_PATH } from "@/lib/routes"

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

  return (
    <main className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(243,247,252,0.92)40%,rgba(233,243,251,0.9))] dark:bg-[linear-gradient(180deg,rgba(6,18,36,0.92),rgba(4,24,43,0.92)40%,rgba(9,32,55,0.92))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(120%_80%_at_0%_0%,var(--brand-2)/0.12,transparent_60%),radial-gradient(110%_120%_at_100%_10%,var(--brand-3)/0.14,transparent_74%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px)",
          backgroundSize: "160px 160px",
          maskImage:
            "radial-gradient(80% 110% at 50% 0%, rgba(0,0,0,0.9), transparent 70%)",
        }}
      />

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-20"
        fillScreen={false}
        className="relative"
      >
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-3xl border border-[color:var(--brand-1)/0.2] bg-background/85 px-8 py-10 shadow-[0px_32px_80px_-55px_rgba(7,58,104,0.6)] backdrop-blur">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--brand-1)/0.25] bg-[color:var(--brand-1)/0.12] text-[color:var(--brand-1)] shadow-[0px_20px_40px_-30px_rgba(7,58,104,0.55)]">
                  <CategoryIcon
                    icon={category.icon}
                    size={26}
                    className="text-[color:var(--brand-1)]"
                  />
                </span>
                <div className="space-y-4 max-w-2xl">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                      {category.name}
                    </h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                      {category.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    <Badge
                      variant="outline"
                      className="border-[color:var(--brand-1)/0.35] bg-background/70 text-[color:var(--brand-1)]"
                    >
                      {products.length} product{products.length !== 1 && "s"}
                    </Badge>
                    {featured.length > 0 ? (
                      <span>{featured.length} featured underway</span>
                    ) : (
                      <span>New submissions welcome</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end lg:w-auto">
                <Button
                  asChild
                  size="lg"
                  className="w-full min-w-[220px] shadow-[0px_25px_55px_-32px_rgba(7,58,104,0.6)] sm:w-auto"
                >
                  <Link href={MEMBER_PRODUCTS_PATH}>
                    Launch in this category
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full min-w-[220px] border-[color:var(--brand-1)/0.35] bg-background/80 text-[color:var(--brand-1)] sm:w-auto"
                >
                  <Link href={PRICING_PATH}>Explore promotion tiers</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PublicContainer>

      {featured.length > 0 && (
        <PublicContainer
          as="section"
          max="marketing"
          paddingY="py-16"
          fillScreen={false}
          className="relative"
        >
          <div className="rounded-3xl border border-[color:var(--brand-1)/0.18] bg-background/88 px-6 py-8 shadow-[0px_30px_80px_-60px_rgba(7,58,104,0.55)] backdrop-blur space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  Featured in {category.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Spotlighted launches currently making waves here.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-[color:var(--brand-1)/0.35] bg-background/80 text-[color:var(--brand-1)]"
              >
                <Link href={PRICING_PATH}>Get featured</Link>
              </Button>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
              <FeaturedBanner item={featured[0]} />
              {featured.length > 1 && (
                <FeaturedProductGrid
                  items={featured.slice(1)}
                  className="grid-cols-1"
                />
              )}
            </div>
          </div>
        </PublicContainer>
      )}

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        fillScreen={false}
        className="relative"
      >
        <CategoryProductsClient
          className="border-[color:var(--brand-1)/0.18]"
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
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        fillScreen={false}
        className="relative"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-[color:var(--brand-1)/0.18] bg-background/82 px-8 py-12 text-center shadow-[0px_32px_90px_-60px_rgba(7,58,104,0.55)] backdrop-blur">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Want featured placement in {category.name}?
          </h2>
          <p className="text-muted-foreground">
            Upgrade your launch to appear at the top of this category and in the
            harbor hero feed. Our crew will help polish your spotlight.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href={PRICING_PATH}>View featured packages</Link>
          </Button>
        </div>
      </PublicContainer>
    </main>
  )
}
