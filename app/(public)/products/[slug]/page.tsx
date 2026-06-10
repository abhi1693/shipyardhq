import type { Metadata } from "next"
import Link from "next/link"
import {
  Suspense,
  type ComponentType,
  type ComponentPropsWithoutRef,
} from "react"
import { notFound } from "next/navigation"
import { JsonLdScript } from "next-seo"
import { IconBrandChrome as ChromeIcon } from "@tabler/icons-react"
import {
  Apple,
  BadgeCheck,
  Calendar,
  ExternalLink,
  Globe,
  Laptop,
  Monitor,
  PlayCircle,
  Smartphone,
  Terminal,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { Image } from "@/components/atoms/image"
import ProductDescriptionCard from "@/components/molecules/ProductDescriptionCard"
import { ProductMediaGallery } from "@/components/organisms/ProductMediaGallery"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { ScrollReset } from "@/components/atoms/scroll-reset"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import {
  DetailSponsoredProductCard,
  ProductUpvoteBadgeServer,
  SimilarProductsServer,
} from "@/components/templates/public/products/detail/server-components"
import {
  ProductUpvoteBadgeFallback,
  SimilarProductsFallback,
} from "@/components/templates/public/products/detail/product-fallbacks"
import { ProductShareModal } from "@/components/templates/public/products/detail/product-share-modal"
import {
  getPublicProductMetaBySlug,
  getPublicProductBySlug,
} from "@/actions/public/products/actions"
import {
  BROWSE_PATH,
  HOME_PATH,
  alternativePath,
  categoryPath,
  platformPath,
  pricingModelPath,
  productPath,
  productTypePath,
  userPath,
} from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"
import { ensureUrlHasSchema } from "@/lib/utils"
import { BADGE_OPTIONS } from "@/lib/constants"
import { buildPageMetadata } from "@/lib/metadata"
import { keywordToSlug } from "@/lib/tags"
import { formatTagLabel } from "@/app/(public)/tags/_utils"
import { buildWebApplicationStructuredData } from "@/lib/seo/web-application"
import { buildMobileApplicationStructuredData } from "@/lib/seo/mobile-application"
import { buildProductStructuredData } from "@/lib/seo/product"
import { getPlatformMetaByValue } from "@/lib/platforms/config"
import { pricingModelSlugFromValue } from "@/lib/pricing/models"
import {
  getProductTypeMeta,
  productTypeSlugFromValue,
} from "@/lib/product-types/models"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import { getProductScoreForCurrentWindow } from "@/lib/server/leaderboard/v2"

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 300

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
    product.keywords
      ?.map((keyword: string) => keyword.trim())
      .filter(Boolean) ?? []

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
  chrome_extension: { label: "Chrome extension", icon: ChromeIcon },
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

function achievementToneClass(value?: string) {
  if (
    value === "new" ||
    value === "trending" ||
    value?.startsWith("product-of-")
  ) {
    return "border-[#F97316]/20 bg-[#F97316]/10 text-[#F97316]"
  }

  return "border-[#0051d5]/20 bg-[#0051d5]/10 text-[#0051d5]"
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getPublicProductMetaBySlug(slug)
  if (!product) return notFound()

  const [sidebarProduct, leaderboardScore] = await Promise.all([
    getPublicProductBySlug(slug),
    getProductScoreForCurrentWindow(product.id).catch(() => null),
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
    ...(product.ProductMedia ?? []).map(
      (media: { imageUrl: string | null }) => media.imageUrl,
    ),
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
  const productTypeSlug = productTypeSlugFromValue(sidebarProduct?.type)
  const productTypeMeta = productTypeSlug
    ? getProductTypeMeta(productTypeSlug)
    : null
  const productTypeLabel =
    productTypeMeta?.label ??
    (sidebarProduct?.type ? formatLabel(sidebarProduct.type) : null)
  const productTypeHref = productTypeMeta
    ? productTypePath(productTypeMeta.slug)
    : null
  const pricingModelLabel = sidebarProduct?.pricingModel
    ? (PRICING_MODEL_LABELS[
        sidebarProduct.pricingModel as keyof typeof PRICING_MODEL_LABELS
      ] ?? formatLabel(sidebarProduct.pricingModel))
    : null
  const isVerified = Boolean(
    product.verification?.isVerified ??
    sidebarProduct?.verification?.isVerified,
  )
  const pricingModelSlug = pricingModelSlugFromValue(
    sidebarProduct?.pricingModel,
  )
  const offer = {
    price: ((sidebarProduct.startingPriceCents ?? 0) / 100).toFixed(2),
    priceCurrency: sidebarProduct.currencyCode || "USD",
  }
  const platformValues = (sidebarProduct.platforms ?? []) as string[]
  const hasWebPlatform = platformValues.includes("web")
  const mobilePlatforms = platformValues.filter((platform: string) =>
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
  let ownerAvatarUrl: string | null = null
  if (productOwner?.clerkId) {
    try {
      const clerkUser = await getClerkUserByIdCached(productOwner.clerkId)
      ownerAvatarUrl = clerkUser.imageUrl ?? null
    } catch {
      ownerAvatarUrl = null
    }
  }

  const productStructuredData = buildProductStructuredData({
    path: canonicalPath,
    name: product.name,
    description: product.tagline || product.description || undefined,
    image: product.logo ?? undefined,
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
  const shareUrl = new URL(canonicalPath, siteConfig.url).toString()
  const categoryLabel = product.category?.name ?? null
  const startingPrice =
    typeof sidebarProduct?.startingPriceCents === "number"
      ? formatCurrency(
          sidebarProduct.startingPriceCents,
          sidebarProduct.currencyCode,
        )
      : null
  const platformItems = ((sidebarProduct?.platforms ?? []) as string[]).map(
    (platform) => {
      const key = String(platform)
      const platformMeta = getPlatformMetaByValue(platform)
      const iconKey = platformMeta?.slug ?? key
      const meta = PLATFORM_CONFIG[iconKey] ??
        PLATFORM_CONFIG[key] ?? {
          label: platformMeta?.label ?? formatLabel(key),
          icon: Globe,
        }
      const path = platformMeta ? platformPath(platformMeta.slug) : null
      return {
        key,
        ...meta,
        path,
      }
    },
  )
  const galleryMedia = (product.ProductMedia ?? [])
    .map((item: (typeof product.ProductMedia)[number]) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      altText: item.altText,
    }))
    .filter((item: { imageUrl: string | null }) => Boolean(item.imageUrl))
  const activeBadgeDefs = ((sidebarProduct?.badges ?? []) as string[])
    .map((badgeKey) => BADGE_LOOKUP[badgeKey])
    .filter(Boolean)
  const keywordTagItems = Array.from(
    new Set<string>(
      (product.keywords ?? [])
        .map((keyword: string | null) => keyword?.trim())
        .filter((keyword: string | undefined | null): keyword is string =>
          Boolean(keyword),
        ),
    ),
  ).map((keyword: string) => {
    const slugValue = keywordToSlug(keyword)
    const formattedLabel = formatTagLabel(keyword)
    return {
      slug: slugValue,
      label: formattedLabel || keyword,
    }
  })
  const normalizedWebsiteUrl = product.websiteUrl?.trim()
    ? ensureUrlHasSchema(product.websiteUrl.trim())
    : null
  const normalizedDemoUrl = product.metadata?.demoUrl?.trim()
    ? ensureUrlHasSchema(product.metadata.demoUrl.trim())
    : null
  const websiteHref = normalizedWebsiteUrl ? `/r/${product.slug}` : null
  const demoHref = normalizedDemoUrl
  const leaderboardPoints =
    typeof leaderboardScore?.score === "number" ? leaderboardScore.score : 0
  const leaderboardRank =
    typeof leaderboardScore?.rank === "number" ? leaderboardScore.rank : null
  const leaderboardPayload = {
    points: leaderboardPoints,
    rank: leaderboardRank,
    available: Boolean(leaderboardScore),
  }
  const analyticsUpvotes =
    sidebarProduct.analytics?.upvotes ?? product.analytics?.upvotes ?? 0
  const sidebarUpvotes = sidebarProduct._count?.ProductUpvote
  const upvoteCount =
    typeof sidebarUpvotes === "number"
      ? Math.max(sidebarUpvotes, analyticsUpvotes)
      : analyticsUpvotes
  const numberFormatter = new Intl.NumberFormat("en-US")
  const productDetailsCard = (
    <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
      {activeBadgeDefs.length ? (
        <div className="border-b border-border pb-4">
          <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Achievements
          </span>
          <div className="flex flex-wrap gap-2">
            {activeBadgeDefs.map((badge) => (
              <Tooltip key={badge.value}>
                <TooltipTrigger
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 ${achievementToneClass(badge.value)}`}
                  aria-label={badge.label}
                >
                  <span className="text-xs leading-none" aria-hidden>
                    {badge.icon}
                  </span>
                  <span className="text-[9px] font-bold uppercase">
                    {badge.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>{badge.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 py-4">
        <div className="flex items-center justify-between gap-4 border-b border-border py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Product type
          </span>
          {productTypeLabel ? (
            productTypeHref ? (
              <Link
                href={productTypeHref}
                className="text-right text-sm font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {productTypeLabel}
              </Link>
            ) : (
              <span className="text-right text-sm font-semibold">
                {productTypeLabel}
              </span>
            )
          ) : (
            <span className="text-sm text-muted-foreground">Not specified</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-border py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pricing model
          </span>
          {pricingModelLabel ? (
            <span className="text-right text-sm font-semibold">
              {pricingModelSlug ? (
                <Link
                  href={pricingModelPath(pricingModelSlug)}
                  className="text-emerald-700 underline-offset-4 hover:underline"
                >
                  {pricingModelLabel}
                </Link>
              ) : (
                <span className="text-emerald-700">{pricingModelLabel}</span>
              )}
              {startingPrice ? (
                <span className="text-muted-foreground">
                  {" "}
                  · Starts at {startingPrice}
                </span>
              ) : null}
            </span>
          ) : startingPrice ? (
            <span className="text-right text-sm font-semibold">
              Starts at {startingPrice}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Not specified</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-border py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Category
          </span>
          {categoryLabel && product.category?.slug ? (
            <Link
              href={categoryPath(product.category.slug)}
              className="text-right text-sm font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {categoryLabel}
            </Link>
          ) : categoryLabel ? (
            <span className="text-right text-sm font-semibold">
              {categoryLabel}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              Not categorized
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Platforms
          </span>
          {platformItems.length ? (
            <div className="flex flex-wrap justify-end gap-2">
              {platformItems.map(({ key, label, icon: Icon, path }) =>
                path ? (
                  <Link
                    key={key}
                    href={path}
                    title={label}
                    className="inline-flex size-8 items-center justify-center rounded-full text-foreground transition hover:bg-muted/60 hover:text-[#0051d5]"
                  >
                    <Icon className="size-5" aria-hidden />
                    <span className="sr-only">{label}</span>
                  </Link>
                ) : (
                  <span
                    key={key}
                    title={label}
                    className="inline-flex size-8 items-center justify-center rounded-full text-foreground"
                  >
                    <Icon className="size-5" aria-hidden />
                    <span className="sr-only">{label}</span>
                  </span>
                ),
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Coming soon</span>
          )}
        </div>
        {sidebarProduct?.alternatives.length ? (
          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Alternative to
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              {sidebarProduct.alternatives.map(
                (alternative: {
                  id: string
                  slug: string
                  name: string
                  logoUrl: string
                }) => (
                  <Link
                    key={alternative.id}
                    href={alternativePath(alternative.slug)}
                    title={alternative.name}
                    aria-label={`View ${alternative.name} alternative`}
                    className="group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border bg-white shadow-sm transition hover:border-foreground/15"
                  >
                    <Image
                      src={alternative.logoUrl}
                      alt={`${alternative.name} logo`}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </Link>
                ),
              )}
            </div>
          </div>
        ) : null}
      </div>
      <div className="border-t border-border pt-4">
        <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Shipyard maker
        </span>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-lg text-sm font-semibold text-foreground">
            {ownerAvatarUrl ? (
              <AvatarImage
                src={ownerAvatarUrl}
                alt={ownerName || "Product owner"}
                width={48}
                height={48}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="rounded-lg">
              {ownerInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {productOwner?.id && ownerName ? (
              <Link
                href={userPath(productOwner.id)}
                className="line-clamp-1 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {ownerName}
              </Link>
            ) : (
              <p className="line-clamp-1 text-sm font-semibold text-foreground">
                {ownerName || "Shipyard maker"}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )

  return (
    <main className="min-h-screen bg-[#f8f9ff]">
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
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6">
        <header className="mb-6 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-6">
            {product.logo ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#061d31] text-white md:h-20 md:w-20">
                <Image
                  src={product.logo}
                  alt={`${product.name} logo`}
                  fill
                  sizes="(min-width: 768px) 80px, 64px"
                  preload
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#061d31] text-lg font-semibold uppercase text-white md:h-20 md:w-20">
                {product.name.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[32px] md:leading-10">
                  {product.name}
                </h1>
                {isVerified ? (
                  <BadgeCheck
                    className="h-5 w-5 text-[#0051d5]"
                    aria-label="Verified"
                    fill="currentColor"
                  />
                ) : null}
              </div>
              {product.tagline ? (
                <p className="mt-1 max-w-2xl text-base leading-6 text-muted-foreground">
                  {product.tagline}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] font-medium text-muted-foreground">
                <ProductShareModal
                  productName={product.name}
                  productTagline={product.tagline}
                  shareUrl={shareUrl}
                />
                {publishedLabel ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    <time
                      dateTime={publishedDateIso ?? undefined}
                      aria-label={`Published on ${publishedLabel}`}
                    >
                      Published on {publishedLabel}
                    </time>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-3 md:w-auto">
            {websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 text-sm font-semibold text-foreground transition hover:bg-muted/60 md:flex-none"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Visit website
              </a>
            ) : null}
            {demoHref ? (
              <a
                href={demoHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 text-sm font-semibold text-foreground transition hover:bg-muted/60 md:flex-none"
              >
                <PlayCircle className="h-4 w-4" aria-hidden />
                Demo
              </a>
            ) : null}
            <Suspense fallback={<ProductUpvoteBadgeFallback />}>
              <ProductUpvoteBadgeServer
                productId={product.id}
                productSlug={product.slug}
                upvoteCount={upvoteCount}
                leaderboard={leaderboardPayload}
                variant="inline"
              />
            </Suspense>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
            <ProductMediaGallery
              bannerImage={product.bannerImage}
              media={galleryMedia}
              productName={product.name}
            />
            <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                The modern way to build with {product.name}.
              </h2>
              <ProductDescriptionCard description={product.description} />
              {keywordTagItems.length ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {keywordTagItems.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={`/tags/${tag.slug}`}
                      className="rounded-sm border border-border bg-[#f8fafc] px-3 py-1 text-[11px] font-medium uppercase text-muted-foreground transition hover:border-[#0051d5]/40 hover:text-[#0051d5]"
                    >
                      #{tag.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4">
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-white p-4 text-center shadow-sm">
                <span className="mb-1 block text-[11px] font-medium uppercase text-muted-foreground">
                  Global rank
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {leaderboardRank !== null
                    ? `#${numberFormatter.format(leaderboardRank)}`
                    : "—"}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-white p-4 text-center shadow-sm">
                <span className="mb-1 block text-[11px] font-medium uppercase text-muted-foreground">
                  Shipyard points
                </span>
                <span className="text-lg font-semibold text-emerald-700">
                  {numberFormatter.format(leaderboardPoints)}
                </span>
              </div>
            </section>
            {productDetailsCard}
            <Suspense
              fallback={
                <div className="h-48 animate-pulse rounded-xl bg-[#061d31]/90" />
              }
            >
              <DetailSponsoredProductCard currentProductSlug={product.slug} />
            </Suspense>
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                You may also like
              </h2>
              {primaryUseCaseSlug ? (
                <Suspense fallback={<SimilarProductsFallback />}>
                  <SimilarProductsServer
                    productId={product.id}
                    useCaseSlug={primaryUseCaseSlug}
                    variant="compact"
                  />
                </Suspense>
              ) : (
                <p className="rounded-lg border border-border bg-white p-4 text-sm text-muted-foreground">
                  Related launches will appear as soon as this product has a
                  matched use case.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
