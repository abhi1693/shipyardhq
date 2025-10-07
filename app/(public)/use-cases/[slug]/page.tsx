import { notFound } from "next/navigation"
import { Metadata } from "next"
import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import PublicContainer from "@/components/layout/PublicContainer"
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
import {
  getPublicUseCaseMeta,
  getPublicUseCaseWithProducts,
  getPublicUseCasesWithCounts,
} from "@/actions/public/use-cases/actions"
import { NewsletterSignupSection } from "@/components/organisms/NewsletterSignupSection"

interface UseCasePageProps {
  params: Promise<{ slug: string }>
}

type UseCaseProduct = NonNullable<
  Awaited<ReturnType<typeof getPublicUseCaseWithProducts>>
>["products"][number]

type UseCaseCategory = NonNullable<
  Awaited<ReturnType<typeof getPublicUseCaseWithProducts>>
>["categories"][number]

export async function generateStaticParams() {
  const useCases = await getPublicUseCasesWithCounts()
  return useCases
    .filter((useCase) => useCase.productCount > 0)
    .map((useCase) => ({ slug: useCase.slug }))
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

export default async function UseCasePage({ params }: UseCasePageProps) {
  const { slug } = await params
  const data = await getPublicUseCaseWithProducts(slug)

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

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-20"
        fillScreen={false}
        className="relative"
      >
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-3xl border border-[color:var(--brand-1)/0.2] bg-background/85 px-8 py-10 shadow-[0px_32px_80px_-55px_rgba(7,58,104,0.6)] backdrop-blur">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
                    Use Case
                  </span>
                  <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                    {useCase.label}
                  </h1>
                  <p className="text-base text-muted-foreground sm:text-lg">
                    A curated fleet of tools designed for makers tackling{" "}
                    {useCase.label}. Explore what’s shipping, discover related
                    categories, and find the perfect fit for your workflow.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  <Badge
                    variant="outline"
                    className="border-[color:var(--brand-1)/0.35] bg-background/70 text-[color:var(--brand-1)]"
                  >
                    {productCount} {pluralize(productCount, "product")}
                  </Badge>
                  {categories.length > 0 && (
                    <span>
                      {categories.length}{" "}
                      {pluralize(categories.length, "category")}
                    </span>
                  )}
                  {heroHighlight && (
                    <span>Trending in {heroHighlight.name}</span>
                  )}
                </div>
              </div>

              <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Button
                  asChild
                  size="lg"
                  className="w-full min-w-[200px] shadow-[0px_25px_55px_-32px_rgba(7,58,104,0.6)] sm:w-auto"
                >
                  <Link href={`${BROWSE_PATH}?useCase=${slug}`}>
                    Explore in browse
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full min-w-[200px] border-[color:var(--brand-1)/0.35] bg-background/80 text-[color:var(--brand-1)] sm:w-auto"
                >
                  <Link href={MEMBER_PRODUCTS_PATH}>Submit your launch</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PublicContainer>

      {categories.length > 0 && (
        <PublicContainer
          as="section"
          max="marketing"
          paddingY="py-16"
          fillScreen={false}
          className="relative"
        >
          <div className="mx-auto max-w-5xl space-y-8 text-center">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold text-foreground">
                Ship-ready categories
              </h2>
              <p className="text-muted-foreground">
                Dive into the categories fueling this use case and spot where to
                dock next.
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
        </PublicContainer>
      )}

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        fillScreen={false}
        className="relative"
      >
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
            Building for {useCase.label}?
          </h2>
          <p className="text-muted-foreground">
            Share your launch with the fleet and reach makers who need exactly
            what you’re crafting.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href={MEMBER_PRODUCTS_PATH}>Add your product</Link>
          </Button>
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        fillScreen={false}
        className="relative"
        innerClassName="overflow-hidden rounded-[46px] border border-primary/15 px-0 md:px-0 dark:border-slate-800/60"
      >
        <NewsletterSignupSection />
      </PublicContainer>
    </main>
  )
}
