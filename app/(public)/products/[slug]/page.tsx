import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  Suspense,
  type ComponentType,
  type ComponentPropsWithoutRef,
} from "react"
import { notFound } from "next/navigation"
import { JsonLdScript } from "next-seo"
import {
  Apple,
  Calendar,
  Chrome as ChromeIcon,
  ExternalLink,
  Globe,
  Laptop,
  Monitor,
  PlayCircle,
  Smartphone,
  Sparkles,
  Terminal,
} from "lucide-react"

import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import ProductShareBar from "@/components/molecules/ProductShareBar"
import ProductDescriptionCard from "@/components/molecules/ProductDescriptionCard"
import { ProductMediaGallery } from "@/components/organisms/ProductMediaGallery"
import ProductMetricsTracker from "@/components/pages/ProductMetricsTracker"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { ScrollReset } from "@/components/atoms/scroll-reset"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { SidebarInfoRow } from "@/components/templates/public/products/detail/sidebar-info-row"
import {
  ProductUpvoteBadgeServer,
  ProductReviewsServer,
  ProductUpdatesServer,
  SimilarProductsServer,
} from "@/components/templates/public/products/detail/server-components"
import {
  ProductUpvoteBadgeFallback,
  ProductReviewsFallback,
  ProductUpdatesFallback,
  SimilarProductsFallback,
} from "@/components/templates/public/products/detail/product-fallbacks"
import {
  getPublicProductMetaBySlug,
  getPublicProductBySlug,
} from "@/actions/public/products/actions"
import {
  BROWSE_PATH,
  HOME_PATH,
  alternativePath,
  categoryPath,
  productPath,
  userPath,
} from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"
import { ensureUrlHasSchema } from "@/lib/utils"
import { addUtmParams } from "@/lib/marketing/utm"
import prisma from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/features"
import { BADGE_OPTIONS } from "@/lib/constants"
import { buildPageMetadata } from "@/lib/metadata"
import { keywordToSlug } from "@/lib/tags"
import { formatTagLabel } from "@/app/(public)/tags/_utils"
import { buildWebApplicationStructuredData } from "@/lib/seo/web-application"
import { buildMobileApplicationStructuredData } from "@/lib/seo/mobile-application"
import { buildProductStructuredData } from "@/lib/seo/product"
import { getProductReviewSummary } from "@/lib/server/productReviews"

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 60

export async function generateStaticParams() {
  const slugs = await prisma.product.findMany({
    where: { status: "published" },
    select: { slug: true },
    orderBy: { updatedAt: "desc" },
  })

  return slugs
    .map((entry) => entry.slug?.trim())
    .filter((value): value is string => Boolean(value))
    .map((slug) => ({ slug }))
}

export async function generateMetadata(
  props: ProductPageProps,
): Promise<Metadata> {
  const { slug } = await props.params
  const product = await getPublicProductMetaBySlug(slug)
  if (!product) return {}

  const canonicalPath = productPath(slug)
  const tagline = product.tagline?.trim() ?? ""
  const description =
    tagline.length > 220 ? `${tagline.slice(0, 217).trimEnd()}...` : tagline

  const pageTitle = tagline ? `${product.name} · ${tagline}` : product.name

  const toAbsoluteImageUrl = (value?: string | null) => {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.startsWith("data:")) return trimmed
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    try {
      return new URL(trimmed, siteConfig.url).toString()
    } catch {
      return ensureUrlHasSchema(trimmed)
    }
  }

  const bannerImageUrl = toAbsoluteImageUrl(product.bannerImage)
  const openGraphImages = bannerImageUrl
    ? [
        {
          url: bannerImageUrl,
          alt: `${product.name} preview`,
        },
      ]
    : []

  const twitterImages = bannerImageUrl ? [bannerImageUrl] : []

  const keywords =
    product.keywords?.map((keyword) => keyword.trim()).filter(Boolean) ?? []

  const metadata = buildPageMetadata({
    title: pageTitle,
    section: "Products",
    description: description || undefined,
    canonical: canonicalPath,
    openGraph: {
      url: canonicalPath,
      ...(openGraphImages.length ? { images: openGraphImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(twitterImages.length ? { images: twitterImages } : {}),
    },
  })

  if (keywords.length) {
    return {
      ...metadata,
      keywords,
    }
  }

  return metadata
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

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getPublicProductMetaBySlug(slug)
  if (!product) return notFound()

  const [sidebarProduct, reviewSummary] = await Promise.all([
    getPublicProductBySlug(slug),
    getProductReviewSummary(product.id, 1),
  ])
  if (!sidebarProduct) return notFound()

  const canonicalPath = productPath(product.slug)
  const productBreadcrumbs = [
    { name: "Home", path: HOME_PATH },
    { name: "Browse", path: BROWSE_PATH },
    { name: product.name, path: canonicalPath },
  ]
  const screenshotSources = [
    product.bannerImage,
    ...(product.ProductMedia ?? []).map((media) => media.imageUrl),
  ].filter((value): value is string => Boolean(value?.trim()))
  const schemaPublishedDateIso =
    product.publishedAt || product.createdAt
      ? new Date(product.publishedAt || product.createdAt).toISOString()
      : undefined
  const updatedDateIso = sidebarProduct.updatedAt
    ? new Date(sidebarProduct.updatedAt).toISOString()
    : undefined
  const ownerName = [
    product.user?.firstName ?? "",
    product.user?.lastName ?? "",
  ]
    .join(" ")
    .trim()
  const productTypeLabel = sidebarProduct?.type
    ? (PRODUCT_TYPE_LABELS[
        sidebarProduct.type as keyof typeof PRODUCT_TYPE_LABELS
      ] ?? formatLabel(sidebarProduct.type))
    : null
  const pricingModelLabel = sidebarProduct?.pricingModel
    ? (PRICING_MODEL_LABELS[
        sidebarProduct.pricingModel as keyof typeof PRICING_MODEL_LABELS
      ] ?? formatLabel(sidebarProduct.pricingModel))
    : null
  const offer =
    typeof sidebarProduct.startingPriceCents === "number"
      ? {
          price: (sidebarProduct.startingPriceCents / 100).toFixed(2),
          priceCurrency: sidebarProduct.currencyCode || "USD",
        }
      : undefined
  const platformValues = sidebarProduct.platforms ?? []
  const hasWebPlatform = platformValues.includes("web")
  const mobilePlatforms = platformValues.filter((platform) =>
    ["ios", "android"].includes(platform),
  )

  const webApplicationStructuredData = hasWebPlatform
    ? buildWebApplicationStructuredData({
        path: canonicalPath,
        name: product.name,
        description: product.tagline || product.description || undefined,
        datePublished: schemaPublishedDateIso,
        dateModified: updatedDateIso,
        operatingSystem: "Web",
        screenshots: screenshotSources,
        offers: offer,
        applicationCategory: productTypeLabel ?? undefined,
      })
    : null

  const mobileOperatingSystems = mobilePlatforms.map((platform) =>
    platform === "ios" ? "iOS" : "Android",
  )

  const mobileApplicationStructuredData = mobileOperatingSystems.length
    ? buildMobileApplicationStructuredData({
        path: canonicalPath,
        name: product.name,
        description: product.tagline || product.description || undefined,
        datePublished: schemaPublishedDateIso,
        dateModified: updatedDateIso,
        operatingSystem: mobileOperatingSystems,
        screenshots: screenshotSources,
        offers: offer,
      })
    : null

  const productOwner = sidebarProduct.user
  const ownerDisplayName = [productOwner?.firstName, productOwner?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()
  const ownerInitials = ownerDisplayName
    ? ownerDisplayName
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2)
    : "SP"

  const aggregateRating =
    reviewSummary.totalReviews > 0
      ? {
          ratingValue: reviewSummary.averageRating,
          ratingCount: reviewSummary.totalReviews,
          bestRating: 5,
          worstRating: 0,
        }
      : undefined

  const productStructuredData = buildProductStructuredData({
    path: canonicalPath,
    name: product.name,
    description: product.tagline || product.description || undefined,
    image: product.logo ?? undefined,
    aggregateRating,
    offers: offer,
  })

  const primaryUseCaseSlug =
    sidebarProduct.category?.useCases?.[0]?.useCase?.slug ?? null
  const publishedSource = product.publishedAt || product.createdAt
  const publishedLabel = publishedSource
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(publishedSource))
    : null
  const publishedDateIso = publishedSource
    ? new Date(publishedSource).toISOString()
    : null
  const shareUrl = new URL(
    `/products/${product.slug}`,
    siteConfig.url,
  ).toString()
  const redirectUrl = productPath(product.slug)
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
  const quickLinkCount =
    (websiteHref ? 1 : 0) + (demoHref ? 1 : 0) + (ctaHref ? 1 : 0)
  const quickLinkGridClass =
    quickLinkCount === 3
      ? "grid-cols-3"
      : quickLinkCount === 2
        ? "grid-cols-2"
        : "grid-cols-1"
  const quickLinkClass =
    "inline-flex w-full items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm shadow-black/5 transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
  const primaryQuickLinkClass =
    "inline-flex w-full items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm shadow-black/10 transition-colors hover:bg-foreground/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
  const productDetailsCard = (
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
            <span className="text-muted-foreground">Not categorized</span>
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
            <span className="text-muted-foreground">Platforms coming soon</span>
          )}
        </SidebarInfoRow>
        {activeBadgeDefs.length ? (
          <SidebarInfoRow label="Badges">
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
                  <TooltipContent sideOffset={6}>{badge.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </SidebarInfoRow>
        ) : null}
        {sidebarProduct?.alternatives.length ? (
          <SidebarInfoRow label="Alternative to">
            <div className="flex flex-wrap gap-2">
              {sidebarProduct?.alternatives.map((alternative) => {
                const href = alternativePath(alternative.slug as string)

                return (
                  <Tooltip key={alternative.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={href}
                        aria-label={`View ${alternative.name} alternative`}
                        className="group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Image
                          src={alternative.logoUrl}
                          alt={`${alternative.name} logo`}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      <span className="font-medium">{alternative.name}</span>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </SidebarInfoRow>
        ) : null}
      </div>
    </div>
  )

  return (
    <main className="bg-white">
      <CoreStructuredData
        scriptKeyPrefix={`product-${product.slug}`}
        webPage={{ path: canonicalPath, name: product.name }}
        breadcrumbs={{ items: productBreadcrumbs }}
      />
      <JsonLdScript
        data={productStructuredData}
        scriptKey={`product-${product.slug}-product`}
      />
      {webApplicationStructuredData ? (
        <JsonLdScript
          data={webApplicationStructuredData}
          scriptKey={`product-${product.slug}-webapp`}
        />
      ) : null}
      {mobileApplicationStructuredData ? (
        <JsonLdScript
          data={mobileApplicationStructuredData}
          scriptKey={`product-${product.slug}-mobileapp`}
        />
      ) : null}
      <ScrollReset triggerKey={product.slug} />
      <ProductMetricsTracker productId={product.id} />
      <PublicTwoColumnLayout
        mainClassName="gap-8"
        sidebarClassName="lg:sticky lg:top-24"
        main={
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-5">
                  {product.logo ? (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-white shadow-sm sm:h-20 sm:w-20">
                      <Image
                        src={product.logo}
                        alt={`${product.name} logo`}
                        fill
                        sizes="(min-width: 640px) 80px, 64px"
                        priority
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-lg font-semibold uppercase text-muted-foreground shadow-sm sm:h-20 sm:w-20">
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
              <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                    {ownerInitials}
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
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
                      <span className="inline-flex items-center gap-1 sm:gap-1.5">
                        <Calendar
                          className="h-4 w-4 text-muted-foreground/80"
                          aria-hidden="true"
                        />
                        <span className="inline-flex items-center gap-1">
                          <span className="hidden text-muted-foreground sm:inline">
                            Published On
                          </span>
                          <time
                            dateTime={publishedDateIso ?? undefined}
                            aria-label={`Published on ${publishedLabel}`}
                            className="text-muted-foreground"
                          >
                            {publishedLabel}
                          </time>
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>
                <ProductShareBar
                  productName={product.name}
                  productTagline={product.tagline}
                  shareUrl={shareUrl}
                  className="self-start sm:ml-auto sm:self-center"
                />
              </div>
              {(websiteHref || demoHref || ctaHref) && (
                <div
                  className={`grid w-full gap-2 text-sm ${quickLinkGridClass} sm:flex sm:flex-wrap sm:items-center`}
                >
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
              <div className="lg:hidden">
                <Suspense fallback={<ProductUpvoteBadgeFallback />}>
                  <ProductUpvoteBadgeServer
                    productId={product.id}
                    upvoteCount={product.analytics?.upvotes ?? 0}
                  />
                </Suspense>
              </div>
            </header>
            <ProductMediaGallery
              bannerImage={product.bannerImage}
              media={galleryMedia}
              productName={product.name}
            />
            <ProductDescriptionCard description={product.description} />
            <div className="lg:hidden">{productDetailsCard}</div>
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
            <Suspense fallback={<ProductUpdatesFallback />}>
              <ProductUpdatesServer
                productId={product.id}
                productSlug={product.slug}
              />
            </Suspense>
            <Suspense fallback={<ProductReviewsFallback />}>
              <ProductReviewsServer
                productId={product.id}
                productName={product.name}
                redirectUrl={redirectUrl}
              />
            </Suspense>
            <StickyBanner className="w-full" />
            {primaryUseCaseSlug ? (
              <Suspense fallback={<SimilarProductsFallback />}>
                <SimilarProductsServer
                  productId={product.id}
                  useCaseSlug={primaryUseCaseSlug}
                />
              </Suspense>
            ) : null}
          </div>
        }
        sidebar={
          <div className="flex flex-col gap-6">
            <div className="hidden lg:block">
              <Suspense fallback={<ProductUpvoteBadgeFallback />}>
                <ProductUpvoteBadgeServer
                  productId={product.id}
                  upvoteCount={product.analytics?.upvotes ?? 0}
                />
              </Suspense>
            </div>
            <div className="hidden lg:block">{productDetailsCard}</div>
            <div className="hidden lg:block">
              <Suspense fallback={<SponsoredProductsSkeleton />}>
                <SponsoredProductsSection />
              </Suspense>
            </div>
          </div>
        }
      />
    </main>
  )
}
