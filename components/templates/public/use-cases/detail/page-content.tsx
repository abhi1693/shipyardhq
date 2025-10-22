import { notFound } from "next/navigation"
import { Metadata } from "next"
import Link from "next/link"
import { CategoryCard } from "@/components/molecules/CategoryCard"
import { CategoryProductsClient as UseCaseProductsClient } from "@/app/(public)/categories/[slug]/client-products"
import { buildPageMetadata } from "@/lib/metadata"
import { pluralize } from "@/lib/pluralize"
import {
  BROWSE_PATH,
  MEMBER_PRODUCTS_PATH,
  categoryPath,
  productPath,
  usecasePath,
} from "@/lib/routes"
import { productHasFeature } from "@/lib/features"
import { getPublicUseCaseMeta } from "@/actions/public/use-cases/actions"
import { NewsletterSignupSection } from "@/components/organisms/NewsletterSignupSection"
import { launchPrimaryButton, launchSecondaryButton } from "@/lib/ui/buttons"
import { brandGradient, gradientTint } from "@/lib/ui/tints"
import HeroStickyBanner from "@/components/layout/HeroStickyBanner"
import {
  getUseCasePagePayload,
  getUseCaseStaticParams,
  type UseCasePagePayload,
} from "@/lib/useCases/page-cache"

interface UseCasePageProps {
  params: Promise<{ slug: string }>
}

type UseCaseProduct = NonNullable<UseCasePagePayload>["products"][number]

type UseCaseCategory = NonNullable<UseCasePagePayload>["categories"][number]

export async function generateStaticParams() {
  return getUseCaseStaticParams()
}

export async function generateMetadata({
  params,
}: UseCasePageProps): Promise<Metadata> {
  const { slug } = await params
  const useCase = await getPublicUseCaseMeta(slug)
  if (!useCase || useCase.productCount === 0) return {}

  const description = `Explore ${useCase.productCount} ${pluralize(
    useCase.productCount,
    "product",
  )} built for ${useCase.label}.`

  return buildPageMetadata({
    title: `${useCase.label} Use Case`,
    section: "Use Cases",
    description,
  })
}

export async function UseCasePageContent({ params }: UseCasePageProps) {
  const { slug } = await params
  const data = await getUseCasePagePayload(slug)

  if (!data) notFound()

  const { useCase, categories, products, productCount } = data

  const heroHighlight = categories[0]
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "")
  const pageUrl = `${baseUrl}${usecasePath(useCase.slug)}`
  const toAbsoluteUrl = (input?: string | null) => {
    if (!input) return undefined
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return input
    }
    return `${baseUrl}${input.startsWith("/") ? input : `/${input}`}`
  }
  const productList = products.slice(0, 20).map((product, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${baseUrl}${productPath(product.slug)}`,
    item: {
      "@type": "Product",
      name: product.name,
      description: product.tagline,
      image: toAbsoluteUrl(product.logo),
      url: `${baseUrl}${productPath(product.slug)}`,
      category: product.category?.name,
    },
  }))
  const categoryMentions = categories.map((category) => ({
    "@type": "Thing",
    name: category.name,
    url: `${baseUrl}${categoryPath(category.slug)}`,
  }))
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${useCase.label} Use Case`,
    description: `Explore ${productCount} ${pluralize(productCount, "product")} built for ${useCase.label}.`,
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      name: `${useCase.label} Products`,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      itemListElement: productList,
    },
    about: {
      "@type": "Thing",
      name: useCase.label,
      url: pageUrl,
    },
    mentions: categoryMentions,
    isPartOf: {
      "@type": "WebSite",
      name: "ShipYardHQ",
      url: baseUrl,
    },
  }

  return (
    <main className="relative isolate overflow-hidden bg-white">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section
        className={brandGradient(
          "relative overflow-hidden border border-[color:var(--brand-1)/0.18] py-20 shadow-[0px_70px_160px_-70px_rgba(18,66,112,0.75)]",
        )}
      >
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 text-center text-white">
            <div className="space-y-4">
              <span
                className={gradientTint(
                  "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80",
                )}
              >
                Use Case
              </span>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {useCase.label}
              </h1>
              <p className="text-base text-white/85 sm:text-lg">
                A curated collection of tools designed for makers tackling{" "}
                {useCase.label}. Explore what’s shipping, discover related
                categories, and find the best fit for your workflow.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.28em] text-white/80">
              <span
                className={gradientTint(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold",
                )}
              >
                {productCount} {pluralize(productCount, "product")}
              </span>
              {categories.length > 0 && (
                <span>
                  {categories.length} {pluralize(categories.length, "category")}
                </span>
              )}
              {heroHighlight ? (
                <span>Trending in {heroHighlight.name}</span>
              ) : null}
            </div>

            <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href={`${BROWSE_PATH}?useCase=${slug}`}
                className={launchPrimaryButton({
                  size: "lg",
                  className: "w-full min-w-[200px] sm:w-auto",
                })}
              >
                Explore in browse
              </Link>
              <Link
                href={MEMBER_PRODUCTS_PATH}
                className={launchSecondaryButton({
                  size: "lg",
                  className:
                    "w-full min-w-[200px] text-white/90 hover:text-white sm:w-auto",
                })}
              >
                Submit your launch
              </Link>
            </div>
          </div>
        </div>
      </section>

      <HeroStickyBanner wrapperClassName="mt-6" innerClassName="max-w-5xl" />

      {categories.length > 0 && (
        <section className="relative py-16">
          <div className="mx-auto max-w-[84rem] px-4 md:px-8">
            <div className="mx-auto max-w-5xl space-y-8 text-center">
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold text-foreground">
                  Related categories
                </h2>
                <p className="text-muted-foreground">
                  Explore the categories fueling this use case and see where to
                  build next.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {categories.map((category: UseCaseCategory) => (
                  <CategoryCard
                    key={category.id}
                    href={categoryPath(category.slug)}
                    name={category.name}
                    icon={category.icon}
                    description={category.description}
                    count={category.productCount}
                    className="w-full max-w-xs"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="relative py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <UseCaseProductsClient
            className="border-[color:var(--brand-1)/0.18]"
            products={products.map((product: UseCaseProduct) => ({
              ...product,
              priority: productHasFeature(product, "priorityPlacement"),
              badges:
                product.ProductBadge?.filter(
                  (badge) =>
                    !badge.expiresAt || new Date(badge.expiresAt) > new Date(),
                ).map((badge) => badge.badge) ?? [],
            }))}
          />
        </div>
      </section>

      <section className="relative py-16">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-[color:var(--brand-1)/0.18] bg-background/82 px-8 py-12 text-center shadow-[0px_32px_90px_-60px_rgba(7,58,104,0.55)] backdrop-blur">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Building for {useCase.label}?
            </h2>
            <p className="text-muted-foreground">
              Share your launch with the community and reach makers who need
              exactly what you’re crafting.
            </p>
            <Link
              href={MEMBER_PRODUCTS_PATH}
              className={launchPrimaryButton({ size: "lg" })}
            >
              Add your product
            </Link>
          </div>
        </div>
      </section>

      <section className="relative py-16">
        <div className="mx-auto max-w-[84rem] overflow-hidden rounded-[46px] border border-primary/15 px-0 md:px-0 dark:border-slate-800/60">
          <NewsletterSignupSection />
        </div>
      </section>
    </main>
  )
}
