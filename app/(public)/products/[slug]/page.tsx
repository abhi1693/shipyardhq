export const revalidate = 60

import Image from "next/image"
import Link from "next/link"
import {
  Suspense,
  type ReactNode,
  type ComponentType,
  type ComponentPropsWithoutRef,
} from "react"
import { notFound } from "next/navigation"
import {
  Apple,
  Calendar,
  Chrome as ChromeIcon,
  ExternalLink,
  Globe,
  Laptop,
  Megaphone,
  Monitor,
  PlayCircle,
  Smartphone,
  Sparkles,
  Terminal,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { auth } from "@clerk/nextjs/server"

import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { StickyBannerRegion } from "@/components/layout/sticky-banner-context"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import ProductUpvoteBadge from "@/components/molecules/ProductUpvoteBadge"
import ProductShareBar from "@/components/molecules/ProductShareBar"
import ProductDescriptionCard from "@/components/molecules/ProductDescriptionCard"
import { ProductMediaGallery } from "@/components/organisms/ProductMediaGallery"
import ProductReviews from "@/components/organisms/ProductReviews"
import { ProductCard } from "@/components/molecules/ProductCard"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import {
  getPublicProductMetaBySlug,
  hasUserUpvoted,
  getPublicProductBySlug,
  getPublicProductsByUseCase,
} from "@/actions/public/products/actions"
import { getPublicProductUpdates } from "@/actions/public/product-updates/actions"
import {
  categoryPath,
  productPath,
  productUpdatesPath,
  userPath,
} from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"
import { ensureUrlHasSchema } from "@/lib/utils"
import { addUtmParams } from "@/lib/marketing/utm"
import { hasPlanFeature } from "@/lib/features"
import { BADGE_OPTIONS } from "@/lib/constants"
import type { ProductUpdatePublicView } from "@/types/product-updates"
import {
  getProductReviewSummary,
  getUserProductReview,
} from "@/lib/server/productReviews"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { toProductCardItem } from "@/lib/products/card-item"
import { keywordToSlug } from "@/lib/tags"
import { formatTagLabel } from "@/app/(public)/tags/_utils"

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  saas: "SaaS",
  browser_extension: "Browser extension",
  mobile_app: "Mobile app",
  desktop_app: "Desktop app",
  api: "API",
  open_source: "Open source",
  other: "Other",
}

const PRICING_MODEL_LABELS: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  subscription: "Subscription",
  one_time: "One-time",
  custom: "Custom",
}

type PlatformMeta = {
  label: string
  icon: ComponentType<ComponentPropsWithoutRef<"svg">>
}

const PLATFORM_CONFIG: Record<string, PlatformMeta> = {
  web: { label: "Web", icon: Globe },
  ios: { label: "iOS", icon: Apple },
  android: { label: "Android", icon: Smartphone },
  mac: { label: "macOS", icon: Laptop },
  windows: { label: "Windows", icon: Monitor },
  linux: { label: "Linux", icon: Terminal },
  chrome: { label: "Chrome extension", icon: ChromeIcon },
}

const BADGE_LOOKUP = BADGE_OPTIONS.reduce(
  (acc, badge) => {
    acc[badge.value] = badge
    return acc
  },
  {} as Record<string, (typeof BADGE_OPTIONS)[number]>,
)

function formatLabel(value: string) {
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatCurrency(
  amountCents: number,
  currencyCode: string | null | undefined,
) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "USD",
      maximumFractionDigits: 2,
    }).format(amountCents / 100)
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`
  }
}

function SidebarInfoRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

function ProductUpdatesSection({
  updates,
  productSlug,
}: {
  updates: ProductUpdatePublicView[]
  productSlug: string
}) {
  const visibleUpdates = updates.slice(0, 3)
  const updatesCount = updates.length
  const hasUpdates = updatesCount > 0
  const updatesBadgeClass = [
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
    hasUpdates
      ? "border-border bg-white text-foreground shadow-sm shadow-black/5"
      : "border-dashed border-border/80 text-muted-foreground",
  ].join(" ")

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-muted text-foreground shadow-sm">
            <Megaphone className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Product updates
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasUpdates
                ? "Latest changelog entries and announcements from the team."
                : "No updates yet. Check back soon for announcements from the team."}
            </p>
          </div>
        </div>
        <div className={updatesBadgeClass}>
          <span>
            {updatesCount} update{updatesCount === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      {hasUpdates ? (
        <div className="divide-y divide-border/70">
          {visibleUpdates.map((update) => {
            const publishedLabel = dateFormatter.format(
              new Date(update.publishedAt ?? update.createdAt),
            )
            return (
              <article
                key={update.id}
                className="space-y-4 py-5 first:pt-0 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                      {update.title}
                    </h3>
                    {update.summary ? (
                      <p className="text-sm text-muted-foreground">
                        {update.summary}
                      </p>
                    ) : null}
                  </div>
                  <time
                    dateTime={update.publishedAt ?? update.createdAt}
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80"
                  >
                    {publishedLabel}
                  </time>
                </div>
                {update.content ? (
                  <div className="prose prose-sm mt-4 max-w-none text-muted-foreground [&>*:last-child]:mb-0">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      disallowedElements={["h1"]}
                      unwrapDisallowed
                    >
                      {update.content}
                    </ReactMarkdown>
                  </div>
                ) : null}
              </article>
            )
          })}
          {updatesCount > visibleUpdates.length ? (
            <div className="mt-4 flex justify-end">
              <Link
                href={productUpdatesPath(productSlug)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-foreground underline-offset-4 transition hover:text-foreground/80 hover:underline"
              >
                View all updates
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border/70 px-6 py-7 text-center text-sm text-muted-foreground">
          No updates yet. Check back soon for announcements from the team.
        </p>
      )}
    </section>
  )
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getPublicProductMetaBySlug(slug)
  if (!product) return notFound()

  const authResult = await auth()
  const clerkUserId = authResult?.userId ?? null
  const viewerPromise = clerkUserId
    ? getActiveUserByClerkId(clerkUserId).catch(() => null)
    : Promise.resolve(null)

  const sidebarProduct = await getPublicProductBySlug(slug)
  if (!sidebarProduct) return notFound()

  const primaryUseCase = sidebarProduct.category?.useCases?.[0]?.useCase ?? null
  const similarProductsPromise = primaryUseCase?.slug
    ? getPublicProductsByUseCase(primaryUseCase.slug, product.id, 4)
    : Promise.resolve([])

  const [productUpdates, reviewSummary, viewer, similarProducts] =
    await Promise.all([
      getPublicProductUpdates(product.id),
      getProductReviewSummary(product.id, 6),
      viewerPromise,
      similarProductsPromise,
    ])

  const viewerUpvoted = clerkUserId
    ? await hasUserUpvoted(product.id, clerkUserId)
    : false
  const viewerReview = viewer
    ? await getUserProductReview(product.id, viewer.id).catch(() => null)
    : null

  const productOwner = sidebarProduct.user
  const ownerName = [productOwner?.firstName, productOwner?.lastName]
    .filter(Boolean)
    .join(" ")
  const ownerInitials = ownerName
    ? ownerName
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2)
    : "SP"
  const publishedSource = product.publishedAt || product.createdAt
  const publishedLabel = publishedSource
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(publishedSource))
    : null
  const shareUrl = new URL(
    `/products/${product.slug}`,
    siteConfig.url,
  ).toString()
  const redirectUrl = productPath(product.slug)
  const productTypeLabel = sidebarProduct?.type
    ? (PRODUCT_TYPE_LABELS[sidebarProduct.type] ??
      formatLabel(sidebarProduct.type))
    : null
  const pricingModelLabel = sidebarProduct?.pricingModel
    ? (PRICING_MODEL_LABELS[sidebarProduct.pricingModel] ??
      formatLabel(sidebarProduct.pricingModel))
    : null
  const categoryLabel = product.category?.name ?? null
  const startingPrice =
    typeof sidebarProduct?.startingPriceCents === "number"
      ? formatCurrency(
          sidebarProduct.startingPriceCents,
          sidebarProduct.currencyCode,
        )
      : null
  const platformItems = (sidebarProduct?.platforms ?? []).map((platform) => {
    const key = String(platform)
    const meta = PLATFORM_CONFIG[key] ?? {
      label: formatLabel(key),
      icon: Globe,
    }
    return {
      key,
      ...meta,
    }
  })
  const galleryMedia = (product.ProductMedia ?? [])
    .map((item) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      altText: item.altText,
    }))
    .filter((item) => Boolean(item.imageUrl))
  const activeBadgeDefs = (sidebarProduct?.badges ?? [])
    .map((badgeKey) => BADGE_LOOKUP[badgeKey])
    .filter(Boolean)
  const keywordTagItems = Array.from(
    new Set(
      (product.keywords ?? [])
        .map((keyword) => keyword?.trim())
        .filter((keyword): keyword is string => Boolean(keyword)),
    ),
  ).map((keyword) => {
    const slugValue = keywordToSlug(keyword)
    const formattedLabel = formatTagLabel(keyword)
    return {
      slug: slugValue,
      label: formattedLabel || keyword,
    }
  })
  const entitlementFeatures = new Set(
    (product.featureEntitlements ?? [])
      .map((feature) => feature.featureKey)
      .filter((value): value is string => Boolean(value)),
  )
  const hasCustomCtaFeature =
    hasPlanFeature(product.plan, "customCTA") ||
    entitlementFeatures.has("customCTA")
  const normalizedWebsiteUrl = product.websiteUrl?.trim()
    ? ensureUrlHasSchema(product.websiteUrl.trim())
    : null
  const normalizedDemoUrl = product.metadata?.demoUrl?.trim()
    ? ensureUrlHasSchema(product.metadata.demoUrl.trim())
    : null
  const ctaLabel = product.ctaLabel?.trim() ?? ""
  const rawCtaUrl = product.ctaUrl?.trim() ?? ""
  const normalizedCtaUrl = rawCtaUrl ? ensureUrlHasSchema(rawCtaUrl) : null
  const withReferralParams = (url: string, content: string) =>
    addUtmParams(url, {
      source: "shipyard",
      medium: "referral",
      campaign: product.metadata?.utmCampaign ?? undefined,
      content,
    })
  const websiteHref = normalizedWebsiteUrl
    ? withReferralParams(normalizedWebsiteUrl, "visit-website")
    : null
  const demoHref = normalizedDemoUrl
    ? withReferralParams(normalizedDemoUrl, "demo")
    : null
  const ctaHref =
    hasCustomCtaFeature && normalizedCtaUrl
      ? withReferralParams(normalizedCtaUrl, "cta")
      : null
  const effectiveCtaLabel = ctaLabel || `Get started with ${product.name}`
  const quickLinkClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm shadow-black/5 transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  const primaryQuickLinkClass =
    "inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm shadow-black/10 transition-colors hover:bg-foreground/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  const similarProductBaseItems = similarProducts.map((item) => ({
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
  }))
  const similarProductCardItems = similarProductBaseItems.map((item) =>
    toProductCardItem(item),
  )

  return (
    <main className="bg-white">
      <PublicTwoColumnLayout
        mainClassName="gap-8"
        sidebarClassName="lg:sticky lg:top-24"
        main={
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-5">
                  {product.logo ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-white shadow-sm sm:h-20 sm:w-20">
                      <Image
                        src={product.logo}
                        alt={`${product.name} logo`}
                        width={80}
                        height={80}
                        priority
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-lg font-semibold uppercase text-muted-foreground shadow-sm sm:h-20 sm:w-20">
                      {product.name.slice(0, 2)}
                    </div>
                  )}
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                      {product.name}
                    </h1>
                    {product.tagline ? (
                      <p className="text-lg text-muted-foreground">
                        {product.tagline}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                  {ownerInitials}
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {productOwner?.id && ownerName ? (
                      <Link
                        href={userPath(productOwner.id)}
                        className="font-medium text-foreground hover:underline"
                      >
                        {ownerName}
                      </Link>
                    ) : ownerName ? (
                      <span className="font-medium text-foreground">
                        {ownerName}
                      </span>
                    ) : null}
                    {publishedLabel ? (
                      <>
                        <span aria-hidden>•</span>
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground/80" />
                          <span>Published on {publishedLabel}</span>
                        </span>
                      </>
                    ) : null}
                  </div>
                  <ProductShareBar
                    productName={product.name}
                    productTagline={product.tagline}
                    shareUrl={shareUrl}
                    className="ml-auto"
                  />
                </div>
              </div>
              {(websiteHref || demoHref || ctaHref) && (
                <div className="flex w-full flex-wrap items-center gap-2 text-sm">
                  {websiteHref ? (
                    <a
                      key="website"
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={quickLinkClass}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      <span>Visit website</span>
                    </a>
                  ) : null}
                  {demoHref ? (
                    <a
                      key="demo"
                      href={demoHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={quickLinkClass}
                    >
                      <PlayCircle className="h-3.5 w-3.5" aria-hidden />
                      <span>Visit demo</span>
                    </a>
                  ) : null}
                  {ctaHref ? (
                    <a
                      key="cta"
                      href={ctaHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={primaryQuickLinkClass}
                    >
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      <span>{effectiveCtaLabel}</span>
                    </a>
                  ) : null}
                </div>
              )}
              <ProductDescriptionCard description={product.description} />
            </header>
            <ProductMediaGallery
              bannerImage={product.bannerImage}
              media={galleryMedia}
              productName={product.name}
            />
            {keywordTagItems.length ? (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {keywordTagItems.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={`/tags/${tag.slug}`}
                      className="text-sm font-medium text-foreground underline decoration-dotted underline-offset-4 transition hover:text-foreground/80"
                    >
                      #{tag.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            <ProductUpdatesSection
              updates={productUpdates}
              productSlug={product.slug}
            />
            <ProductReviews
              productId={product.id}
              productName={product.name}
              reviewSummary={reviewSummary}
              viewerReview={
                viewerReview
                  ? {
                      rating: viewerReview.rating,
                      message: viewerReview.message,
                    }
                  : null
              }
              isSignedIn={Boolean(viewer)}
              redirectUrl={redirectUrl}
            />
            <StickyBannerRegion priority={20} className="w-full" />
            {similarProductCardItems.length ? (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">
                  You may also like
                </h2>
                <div className="space-y-3">
                  {similarProductCardItems.map((item) => (
                    <ProductCard key={item.id} product={item} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        }
        sidebar={
          <div className="flex flex-col gap-6">
            <ProductUpvoteBadge
              productId={product.id}
              count={product.analytics?.upvotes ?? 0}
              initialUpvoted={viewerUpvoted}
            />
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5">
                <SidebarInfoRow label="Product type">
                  {productTypeLabel ? (
                    <span>{productTypeLabel}</span>
                  ) : (
                    <span className="text-muted-foreground">Not specified</span>
                  )}
                </SidebarInfoRow>
                <SidebarInfoRow label="Pricing model">
                  {pricingModelLabel ? (
                    <span>
                      {pricingModelLabel}
                      {startingPrice ? ` · Starts at ${startingPrice}` : ""}
                    </span>
                  ) : startingPrice ? (
                    <span>Starts at {startingPrice}</span>
                  ) : (
                    <span className="text-muted-foreground">Not specified</span>
                  )}
                </SidebarInfoRow>
                <SidebarInfoRow label="Category">
                  {categoryLabel && product.category?.slug ? (
                    <Link
                      href={categoryPath(product.category.slug)}
                      className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 transition-colors hover:text-foreground/80 hover:underline"
                    >
                      {categoryLabel}
                    </Link>
                  ) : categoryLabel ? (
                    <span>{categoryLabel}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      Not categorized
                    </span>
                  )}
                </SidebarInfoRow>
                <SidebarInfoRow label="Platforms">
                  {platformItems.length ? (
                    <div className="flex flex-wrap gap-2">
                      {platformItems.map(({ key, label, icon: Icon }) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground shadow-sm"
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                          <span>{label}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Platforms coming soon
                    </span>
                  )}
                </SidebarInfoRow>
                <SidebarInfoRow label="Badges">
                  {activeBadgeDefs.length ? (
                    <div className="flex flex-wrap gap-2">
                      {activeBadgeDefs.map((badge) => (
                        <Tooltip key={badge.value}>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-white text-sm shadow-sm"
                              aria-label={badge.label}
                            >
                              <span aria-hidden>{badge.icon}</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>
                            {badge.label}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No badges yet</span>
                  )}
                </SidebarInfoRow>
              </div>
            </div>
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              <SponsoredProductsSection />
            </Suspense>
          </div>
        }
      />
    </main>
  )
}
