import { PublicAdLayout } from "@/components/templates/public/common/PublicAdLayout"
import type { Metadata } from "next"
import Link from "next/link"
import { type ComponentType, type ComponentPropsWithoutRef } from "react"
import { preload } from "react-dom"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { JsonLdScript } from "next-seo"
import { IconBrandChrome as ChromeIcon } from "@tabler/icons-react"
import {
  Apple,
  ArrowRight,
  BadgeCheck,
  Calendar,
  ExternalLink,
  Globe,
  Laptop,
  Link as LinkIcon,
  Monitor,
  PlayCircle,
  Smartphone,
  Share2,
  Terminal,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/atoms/avatar"
import { ProductLogoImage } from "@/components/atoms/product-logo-image"
import ProductDescriptionCard from "@/components/molecules/ProductDescriptionCard"
import { ProductCategoryPills } from "@/components/molecules/ProductCategoryPills"
import { ProductWebsiteLink } from "@/components/molecules/ProductWebsiteLink"
import { ProductMediaGallery } from "@/components/organisms/ProductMediaGallery"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { ScrollReset } from "@/components/atoms/scroll-reset"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import {
  DetailPromotionSlot,
  ProductUpvoteBadgeServer,
  SimilarProductsServer,
} from "@/components/templates/public/products/detail/server-components"
import {
  getProductStaticParams,
  getPublicProductMetaBySlug,
  getPublicProductBySlug,
} from "@/actions/public/products/actions"
import {
  BROWSE_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  alternativeCategoryPath,
  alternativePath,
  categoryPlatformPath,
  categoryPath,
  categoryPricingPath,
  categoryProductTypePath,
  dailyLeaderboardPath,
  monthlyLeaderboardPath,
  platformPath,
  pricingModelPath,
  productPath,
  productTypePath,
  tagPath,
  usecaseCategoryPath,
  usecasePath,
  usecasePlatformPath,
  usecasePricingPath,
  userPath,
} from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"
import { cn, ensureUrlHasSchema } from "@/lib/utils"
import {
  AI_SEARCH_READY_PLAN_FEATURE_KEY,
  BACKLINK_PLAN_FEATURE_KEY,
  BADGE_OPTIONS,
} from "@/lib/constants"
import { hasPlanFeature } from "@/lib/features"
import { buildMetaDescription, buildPageMetadata } from "@/lib/metadata"
import { keywordToSlug } from "@/lib/tags"
import { formatTagLabel } from "@/app/(public)/tags/_utils"
import { buildWebApplicationStructuredData } from "@/lib/seo/web-application"
import { buildMobileApplicationStructuredData } from "@/lib/seo/mobile-application"
import {
  buildProductStructuredData,
  resolveProductOfferFromPricing,
} from "@/lib/seo/product"
import { getPlatformMetaByValue } from "@/lib/platforms/config"
import { pricingModelSlugFromValue } from "@/lib/pricing/models"
import {
  getProductTypeMeta,
  productTypeSlugFromValue,
} from "@/lib/product-types/models"
import { getProductScoreForCurrentWindow } from "@/lib/server/leaderboard/v2"
import { buildSignedImgproxyResponsiveImage } from "@/lib/images/imgproxy"
import { resolveProductCategories } from "@/lib/products/categories"
import {
  PRODUCT_GALLERY_MAIN_IMAGE_DEFAULT_WIDTH,
  PRODUCT_GALLERY_MAIN_IMAGE_QUALITY,
  PRODUCT_GALLERY_MAIN_IMAGE_SIZES,
  PRODUCT_GALLERY_MAIN_IMAGE_WIDTHS,
  type DirectProductGalleryImage,
} from "@/lib/images/product-gallery"

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const params = await getProductStaticParams()
  return params
}

export async function generateMetadata(
  props: ProductPageProps,
): Promise<Metadata> {
  const { slug } = await props.params
  await connection()
  const product = await getPublicProductMetaBySlug(slug)
  if (!product) return {}

  const canonicalPath = productPath(slug)
  const tagline = product.tagline?.trim() ?? ""
  const description = buildProductDetailMetaDescription(product)

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
      description,
      ...(openGraphImages.length ? { images: openGraphImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      description,
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

async function buildDirectInitialGalleryImage(
  originalSrc: string | null,
): Promise<DirectProductGalleryImage | null> {
  const sourceUrl = originalSrc?.trim()
  if (!originalSrc || !sourceUrl) return null

  const signedImage = await buildSignedImgproxyResponsiveImage({
    src: sourceUrl,
    widths: [...PRODUCT_GALLERY_MAIN_IMAGE_WIDTHS],
    defaultWidth: PRODUCT_GALLERY_MAIN_IMAGE_DEFAULT_WIDTH,
    quality: PRODUCT_GALLERY_MAIN_IMAGE_QUALITY,
  })

  if (!signedImage) return null

  return {
    originalSrc,
    sizes: PRODUCT_GALLERY_MAIN_IMAGE_SIZES,
    ...signedImage,
  }
}

function preloadDirectInitialGalleryImage(image: DirectProductGalleryImage) {
  preload(image.src, {
    as: "image",
    imageSrcSet: image.srcSet,
    imageSizes: image.sizes,
    fetchPriority: "high",
  })
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

function getPricingModelLabel(value?: string | null) {
  if (!value) return null
  return (
    PRICING_MODEL_LABELS[value as keyof typeof PRICING_MODEL_LABELS] ??
    formatLabel(value)
  )
}

function buildProductDetailMetaDescription(product: {
  name: string
  tagline?: string | null
  description?: string | null
  category?: { name?: string | null } | null
  pricingModel?: string | null
  platforms?: unknown
}) {
  const categoryLabel = product.category?.name?.trim()
  const pricingLabel = getPricingModelLabel(product.pricingModel)
  const platformLabels = Array.isArray(product.platforms)
    ? product.platforms
        .map((platform) =>
          typeof platform === "string"
            ? (getPlatformMetaByValue(platform)?.label ?? formatLabel(platform))
            : null,
        )
        .filter((label): label is string => Boolean(label))
        .slice(0, 2)
    : []
  const platformPhrase = platformLabels.length
    ? ` for ${platformLabels.join(" and ")}`
    : ""
  const pricingPhrase = pricingLabel
    ? ` with ${pricingLabel.toLowerCase()} pricing`
    : ""
  const categoryPhrase = categoryLabel
    ? `a ${categoryLabel} product`
    : "a Shipyard product"
  const fallbackDescription = `${product.name} is ${categoryPhrase}${platformPhrase}${pricingPhrase}. Explore features, pricing, launch details, alternatives, and maker information on Shipyard.`

  return (
    buildMetaDescription(
      product.description,
      product.tagline,
      fallbackDescription,
    ) ?? fallbackDescription
  )
}

type InternalLink = {
  label: string
  href: string
  description: string
}

type InternalLinkGroup = {
  title: string
  links: InternalLink[]
}

function uniqueInternalLinks(links: InternalLink[], limit = 8) {
  const seen = new Set<string>()
  return links
    .filter((link) => {
      if (!link.href || seen.has(link.href)) return false
      seen.add(link.href)
      return true
    })
    .slice(0, limit)
}

function ProductShareMenu({
  productName,
  productTagline,
  shareUrl,
}: {
  productName: string
  productTagline?: string | null
  shareUrl: string
}) {
  const shareText = [productName.trim(), productTagline?.trim()]
    .filter(Boolean)
    .join(" - ")
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(shareText)
  const encodedName = encodeURIComponent(productName)

  const links = [
    {
      label: "Product link",
      href: shareUrl,
      icon: LinkIcon,
    },
    {
      label: "Twitter",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      icon: Share2,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: Share2,
    },
    {
      label: "Reddit",
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedName}`,
      icon: Share2,
    },
  ]

  return (
    <details className="group relative">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-[#0051d5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5]/30">
        <Share2 className="h-3.5 w-3.5" aria-hidden />
        <span>Share</span>
      </summary>
      <div className="absolute left-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-white p-1 shadow-lg">
        {links.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </details>
  )
}

function achievementToneClass(value?: string) {
  if (
    value === "new" ||
    value === "trending" ||
    value?.startsWith("product-of-")
  ) {
    return "border-[#fed7aa] bg-[#ffedd5] text-[#9a3412]"
  }

  return "border-[#0051d5]/20 bg-[#0051d5]/10 text-[#0051d5]"
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params
  await connection()
  const product = await getPublicProductMetaBySlug(slug)
  if (!product) return notFound()

  const [sidebarProduct, leaderboardScore] = await Promise.all([
    getPublicProductBySlug(slug),
    getProductScoreForCurrentWindow(product.id).catch(() => null),
  ])
  if (!sidebarProduct) return notFound()

  const canonicalPath = productPath(product.slug)
  const productMetaDescription = buildProductDetailMetaDescription(product)
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
  const hasAiSearchReadyProfile = hasPlanFeature(
    sidebarProduct.plan,
    AI_SEARCH_READY_PLAN_FEATURE_KEY,
  )
  const pricingModelSlug = pricingModelSlugFromValue(
    sidebarProduct?.pricingModel,
  )
  const offer = resolveProductOfferFromPricing({
    pricingModel: sidebarProduct.pricingModel,
    startingPriceCents: sidebarProduct.startingPriceCents,
    currencyCode: sidebarProduct.currencyCode,
  })
  const platformValues = (sidebarProduct.platforms ?? []) as string[]
  const normalizedWebsiteUrl = product.websiteUrl?.trim()
    ? ensureUrlHasSchema(product.websiteUrl.trim())
    : null
  const hasDirectWebsiteLink = Boolean(
    normalizedWebsiteUrl &&
    hasPlanFeature(sidebarProduct.plan, BACKLINK_PLAN_FEATURE_KEY),
  )
  const hasWebPlatform = platformValues.includes("web")
  const mobilePlatforms = platformValues.filter((platform: string) =>
    ["ios", "android"].includes(platform),
  )

  const webApplicationStructuredDataId = new URL(
    `${canonicalPath}#webapplication`,
    siteConfig.url,
  ).toString()
  const mobileApplicationStructuredDataId = new URL(
    `${canonicalPath}#mobileapplication`,
    siteConfig.url,
  ).toString()

  const webApplicationStructuredData = hasWebPlatform
    ? buildWebApplicationStructuredData({
        path: canonicalPath,
        id: webApplicationStructuredDataId,
        name: product.name,
        description: productMetaDescription,
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
        id: mobileApplicationStructuredDataId,
        name: product.name,
        description: productMetaDescription,
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
  const makerName = ownerDisplayName || ownerName || null
  const categoryLabel = product.category?.name?.trim() ?? null
  const productCategories = resolveProductCategories(
    sidebarProduct.category,
    sidebarProduct.categories,
  )
  const platformFactLabels = Array.from(
    new Set(
      platformValues
        .map((platform) => {
          const value = String(platform)
          return getPlatformMetaByValue(value)?.label ?? formatLabel(value)
        })
        .filter(Boolean),
    ),
  )
  const productKeywords = Array.from(
    new Set<string>(
      (product.keywords ?? [])
        .map((keyword: string | null) => keyword?.trim())
        .filter((keyword: string | undefined | null): keyword is string =>
          Boolean(keyword),
        ),
    ),
  )
  const productAlternatives = (sidebarProduct.alternatives ?? []).map(
    (alternative) => ({
      name: alternative.name,
      url: alternativePath(alternative.slug),
      image: alternative.logoUrl,
    }),
  )
  const productImageSources = [
    product.logo,
    product.bannerImage,
    ...(product.ProductMedia ?? []).map(
      (media: { imageUrl: string | null }) => media.imageUrl,
    ),
  ].filter((value): value is string => Boolean(value?.trim()))
  const productStructuredDataId = new URL(
    `${canonicalPath}#product`,
    siteConfig.url,
  ).toString()
  const productWebPageId = new URL(
    `${canonicalPath}#webpage`,
    siteConfig.url,
  ).toString()
  const makerEntity = makerName
    ? {
        type: "Person" as const,
        name: makerName,
        ...(productOwner?.id ? { url: userPath(productOwner.id) } : {}),
      }
    : undefined
  const productStructuredData = offer
    ? buildProductStructuredData({
        path: canonicalPath,
        id: productStructuredDataId,
        name: product.name,
        description: productMetaDescription,
        image: productImageSources,
        logo: product.logo ?? undefined,
        category: categoryLabel ?? undefined,
        keywords: productKeywords,
        releaseDate: schemaPublishedDateIso,
        datePublished: schemaPublishedDateIso,
        dateModified: updatedDateIso,
        mainEntityOfPage: productWebPageId,
        creator: makerEntity,
        manufacturer: makerEntity,
        brand: makerEntity,
        sameAs: normalizedWebsiteUrl ? [normalizedWebsiteUrl] : undefined,
        isSimilarTo: productAlternatives,
        additionalProperty: [
          ...(makerName ? [{ name: "Maker", value: makerName }] : []),
          ...(categoryLabel
            ? [{ name: "Category", value: categoryLabel }]
            : []),
          ...(pricingModelLabel
            ? [{ name: "Pricing model", value: pricingModelLabel }]
            : []),
          ...(platformFactLabels.length
            ? [
                {
                  name: "Supported platforms",
                  value: platformFactLabels.join(", "),
                },
              ]
            : []),
          ...(schemaPublishedDateIso
            ? [{ name: "Launch date", value: schemaPublishedDateIso }]
            : []),
          {
            name: "Verified status",
            value: isVerified ? "Verified" : "Not verified",
          },
          ...(hasDirectWebsiteLink
            ? [{ name: "Direct website link", value: "Enabled" }]
            : []),
          ...(hasAiSearchReadyProfile
            ? [{ name: "AI-search ready profile", value: "Enabled" }]
            : []),
          ...(productAlternatives.length
            ? [
                {
                  name: "Alternatives",
                  value: productAlternatives
                    .map((alternative) => alternative.name)
                    .join(", "),
                },
              ]
            : []),
          ...(productKeywords.length
            ? [{ name: "Tags", value: productKeywords.join(", ") }]
            : []),
        ],
        offers: offer,
      })
    : null
  const pageMainEntity = productStructuredData
    ? {
        id: productStructuredDataId,
      }
    : webApplicationStructuredData
      ? {
          id: webApplicationStructuredDataId,
        }
      : mobileApplicationStructuredData
        ? {
            id: mobileApplicationStructuredDataId,
          }
        : undefined

  const primaryUseCaseSlug =
    sidebarProduct.category?.useCases?.[0]?.useCase?.slug ?? null
  const primaryUseCaseLabel =
    sidebarProduct.category?.useCases?.[0]?.useCase?.label ?? null
  const primaryCategorySlug = sidebarProduct.category?.slug ?? null
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
  const primaryGalleryImage =
    product.bannerImage || galleryMedia[0]?.imageUrl || null
  const directInitialGalleryImage =
    await buildDirectInitialGalleryImage(primaryGalleryImage)
  if (directInitialGalleryImage) {
    preloadDirectInitialGalleryImage(directInitialGalleryImage)
  }
  const activeBadgeDefs = ((sidebarProduct?.badges ?? []) as string[])
    .map((badgeKey) => BADGE_LOOKUP[badgeKey])
    .filter(Boolean)
  const keywordTagItems = productKeywords.map((keyword: string) => {
    const slugValue = keywordToSlug(keyword)
    const formattedLabel = formatTagLabel(keyword)
    return {
      slug: slugValue,
      label: formattedLabel || keyword,
    }
  })
  const normalizedVideoUrl = product.metadata?.videoUrl?.trim()
    ? ensureUrlHasSchema(product.metadata.videoUrl.trim())
    : null
  const websiteHref = normalizedWebsiteUrl
    ? hasDirectWebsiteLink
      ? normalizedWebsiteUrl
      : `/r/${product.slug}`
    : null
  const websiteRel = hasDirectWebsiteLink
    ? "noopener sponsored"
    : "noopener noreferrer"
  const videoHref = normalizedVideoUrl
  const leaderboardPoints =
    typeof leaderboardScore?.score === "number" ? leaderboardScore.score : 0
  const leaderboardRank =
    typeof leaderboardScore?.rank === "number" ? leaderboardScore.rank : null
  const hasMeaningfulLeaderboardMetrics = Boolean(
    leaderboardScore && (leaderboardPoints > 0 || leaderboardRank !== null),
  )
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
  const launchDate =
    publishedSource && !Number.isNaN(new Date(publishedSource).getTime())
      ? new Date(publishedSource)
      : null
  const useCaseLinks = uniqueInternalLinks([
    ...(sidebarProduct.category?.useCases ?? [])
      .map((item) => item.useCase)
      .filter((useCase): useCase is { slug: string; label: string } =>
        Boolean(useCase?.slug && useCase?.label),
      )
      .map((useCase) => ({
        label: `Use case: ${useCase.label}`,
        href: usecasePath(useCase.slug),
        description: `Compare products for teams that ${useCase.label.toLowerCase()}, including tools related to ${product.name}.`,
      })),
    ...(primaryUseCaseSlug && primaryCategorySlug && categoryLabel
      ? [
          {
            label: `${categoryLabel} for ${primaryUseCaseLabel ?? "this use case"}`,
            href: usecaseCategoryPath(primaryUseCaseSlug, primaryCategorySlug),
            description: `Narrow the research to ${categoryLabel.toLowerCase()} products for ${primaryUseCaseLabel?.toLowerCase() ?? "this use case"}.`,
          },
        ]
      : []),
  ])
  const platformDirectoryLinks = uniqueInternalLinks(
    platformValues
      .map((platform) => getPlatformMetaByValue(platform))
      .filter(
        (
          platform,
        ): platform is NonNullable<ReturnType<typeof getPlatformMetaByValue>> =>
          Boolean(platform),
      )
      .flatMap((platform) => [
        {
          label: `Platform: ${platform.label}`,
          href: platformPath(platform.slug),
          description: `Browse products that support ${platform.label}, including tools related to ${product.name}.`,
        },
        ...(primaryCategorySlug && categoryLabel
          ? [
              {
                label: `${categoryLabel} for ${platform.label}`,
                href: categoryPlatformPath(primaryCategorySlug, platform.slug),
                description: `Compare ${categoryLabel.toLowerCase()} products that support ${platform.label}.`,
              },
            ]
          : []),
        ...(primaryUseCaseSlug
          ? [
              {
                label: `${platform.label} tools for this use case`,
                href: usecasePlatformPath(primaryUseCaseSlug, platform.slug),
                description: `Compare ${platform.label} products for the same use case as ${product.name}.`,
              },
            ]
          : []),
      ]),
  )
  const pricingDirectoryLinks = uniqueInternalLinks(
    [
      ...(pricingModelSlug && pricingModelLabel
        ? [
            {
              label: `Pricing: ${pricingModelLabel}`,
              href: pricingModelPath(pricingModelSlug),
              description: `Browse products with ${pricingModelLabel.toLowerCase()} pricing, including tools related to ${product.name}.`,
            },
          ]
        : []),
      ...(primaryCategorySlug && categoryLabel && pricingModelSlug
        ? [
            {
              label: `${categoryLabel} with ${pricingModelLabel ?? pricingModelSlug} pricing`,
              href: categoryPricingPath(primaryCategorySlug, pricingModelSlug),
              description: `Compare ${categoryLabel.toLowerCase()} products by pricing model.`,
            },
          ]
        : []),
      ...(primaryUseCaseSlug && pricingModelSlug
        ? [
            {
              label: `${pricingModelLabel ?? pricingModelSlug} tools for this use case`,
              href: usecasePricingPath(primaryUseCaseSlug, pricingModelSlug),
              description: `Compare products for ${primaryUseCaseLabel?.toLowerCase() ?? "this use case"} by pricing model.`,
            },
          ]
        : []),
    ],
    6,
  )
  const taxonomyLinks = uniqueInternalLinks(
    [
      ...productCategories.flatMap((category) =>
        category.slug
          ? [
              {
                label: `More in ${category.name}`,
                href: categoryPath(category.slug),
                description: `Browse more ${category.name.toLowerCase()} products and compare where ${product.name} fits in the category.`,
              },
            ]
          : [],
      ),
      ...(productTypeHref && productTypeLabel
        ? [
            {
              label: `More ${productTypeLabel}`,
              href: productTypeHref,
              description: `Browse more ${productTypeLabel.toLowerCase()} products related to ${product.name}.`,
            },
          ]
        : []),
      ...(primaryCategorySlug && categoryLabel && productTypeMeta
        ? [
            {
              label: `${categoryLabel} ${productTypeLabel ?? productTypeMeta.label}`,
              href: categoryProductTypePath(
                primaryCategorySlug,
                productTypeMeta.slug,
              ),
              description: `Compare ${categoryLabel.toLowerCase()} products by product type.`,
            },
          ]
        : []),
      ...keywordTagItems.map((tag) => ({
        label: `#${tag.label}`,
        href: tagPath(tag.slug),
        description: `Browse products tagged with ${tag.label}.`,
      })),
    ],
    10,
  )
  const alternativeInternalLinks = uniqueInternalLinks(
    sidebarProduct.alternatives.flatMap((alternative) => [
      {
        label: `Compare ${alternative.name} alternatives`,
        href: alternativePath(alternative.slug),
        description: `Use this comparison path when evaluating ${product.name} against ${alternative.name} alternatives.`,
      },
      ...(primaryCategorySlug && categoryLabel
        ? [
            {
              label: `${alternative.name} alternatives in ${categoryLabel}`,
              href: alternativeCategoryPath(
                alternative.slug,
                primaryCategorySlug,
              ),
              description: `Compare ${categoryLabel.toLowerCase()} products people evaluate against ${alternative.name}.`,
            },
          ]
        : []),
    ]),
    8,
  )
  const makerInternalLinks = uniqueInternalLinks(
    productOwner?.id && ownerName
      ? [
          {
            label: `Maker: ${ownerName}`,
            href: userPath(productOwner.id),
            description: `View ${ownerName}'s maker profile and other launches.`,
          },
        ]
      : [],
  )
  const leaderboardInternalLinks = uniqueInternalLinks(
    [
      {
        label: "Current launch leaderboard",
        href: LEADERBOARD_PATH,
        description: "See products currently gaining traction on Shipyard.",
      },
      ...(launchDate
        ? [
            {
              label: "Launch day archive",
              href: dailyLeaderboardPath(
                launchDate.getUTCFullYear(),
                launchDate.getUTCMonth() + 1,
                launchDate.getUTCDate(),
              ),
              description:
                "Check the dated leaderboard archive for this product's launch day.",
            },
            {
              label: "Launch month archive",
              href: monthlyLeaderboardPath(
                launchDate.getUTCFullYear(),
                launchDate.getUTCMonth() + 1,
              ),
              description:
                "Check the monthly leaderboard archive for this product's launch period.",
            },
          ]
        : []),
    ],
    4,
  )
  const similarInternalLinks = uniqueInternalLinks(
    [
      ...(primaryUseCaseSlug
        ? [
            {
              label: "Similar products by use case",
              href: usecasePath(primaryUseCaseSlug),
              description: `Browse more products for ${primaryUseCaseLabel?.toLowerCase() ?? "the same use case"}.`,
            },
          ]
        : []),
      ...productCategories.flatMap((category) =>
        category.slug
          ? [
              {
                label: `Similar ${category.name} products`,
                href: categoryPath(category.slug),
                description: `Browse more products in ${category.name.toLowerCase()} and compare them with ${product.name}.`,
              },
            ]
          : [],
      ),
    ],
    4,
  )
  const internalLinkGroups: InternalLinkGroup[] = [
    {
      title: "Product context",
      links: uniqueInternalLinks([
        ...taxonomyLinks,
        ...makerInternalLinks,
        ...useCaseLinks,
      ]),
    },
    {
      title: "Pricing and platform slices",
      links: uniqueInternalLinks([
        ...pricingDirectoryLinks,
        ...platformDirectoryLinks,
      ]),
    },
    {
      title: "Alternatives and similar launches",
      links: uniqueInternalLinks([
        ...alternativeInternalLinks,
        ...similarInternalLinks,
      ]),
    },
    {
      title: "Leaderboard archives",
      links: leaderboardInternalLinks,
    },
  ].filter((group) => group.links.length)
  const visibleInternalLinks = uniqueInternalLinks(
    [
      taxonomyLinks[0],
      makerInternalLinks[0],
      useCaseLinks[0],
      pricingDirectoryLinks[0],
      platformDirectoryLinks[0],
      alternativeInternalLinks[0],
      leaderboardInternalLinks[0],
      similarInternalLinks[0],
    ].filter((link): link is InternalLink => Boolean(link)),
    6,
  )
  const visibleInternalLinkHrefs = new Set(
    visibleInternalLinks.map((link) => link.href),
  )
  const overflowInternalLinkGroups = internalLinkGroups
    .map((group) => ({
      ...group,
      links: group.links.filter(
        (link) => !visibleInternalLinkHrefs.has(link.href),
      ),
    }))
    .filter((group) => group.links.length)
  const overflowInternalLinkCount = overflowInternalLinkGroups.reduce(
    (total, group) => total + group.links.length,
    0,
  )
  const productPromotionSlot = await DetailPromotionSlot({
    currentProductSlug: product.slug,
  })
  const similarProductsContent =
    primaryUseCaseSlug || primaryCategorySlug
      ? await SimilarProductsServer({
          categorySlug: primaryCategorySlug,
          productId: product.id,
          useCaseSlug: primaryUseCaseSlug,
          variant: "compact",
        })
      : null
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
            Categories
          </span>
          <ProductCategoryPills
            categories={productCategories}
            emptyLabel="Not categorized"
            className="justify-end"
            pillClassName="rounded-md bg-muted/60 px-2.5 py-1 text-[11px]"
          />
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
        {hasAiSearchReadyProfile ? (
          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              AI profile
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0051d5]/20 bg-[#eff6ff] px-2.5 py-1 text-xs font-semibold text-[#0051d5]">
              <BadgeCheck className="size-3.5" aria-hidden />
              AI-search ready
            </span>
          </div>
        ) : null}
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
                    <ProductLogoImage
                      src={alternative.logoUrl}
                      name={alternative.name}
                      width={36}
                      height={36}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
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
        webPage={{
          path: canonicalPath,
          id: productWebPageId,
          name: product.name,
          description: productMetaDescription,
          keywords: productKeywords,
          datePublished: schemaPublishedDateIso,
          dateModified: updatedDateIso,
          primaryImageOfPage: product.bannerImage ?? product.logo ?? undefined,
          mainEntity: pageMainEntity,
        }}
        breadcrumbs={{
          items: productBreadcrumbs,
          options: { pageUrl: canonicalPath },
        }}
      />
      {productStructuredData ? (
        <JsonLdScript
          data={productStructuredData}
          scriptKey={`product-${product.slug}-product`}
        />
      ) : null}
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
      <PublicAdLayout pathname={`/products/${product.slug}`}>
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6">
          <header className="mb-6 grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex min-w-0 items-center gap-6">
              {product.logo ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#061d31] text-white md:h-20 md:w-20">
                  <ProductLogoImage
                    src={product.logo}
                    name={product.name}
                    width={80}
                    height={80}
                    loading="lazy"
                    decoding="async"
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
                      className="h-5 w-5 fill-[#0051d5] text-white"
                      aria-label="Verified"
                    />
                  ) : null}
                </div>
                {product.tagline ? (
                  <p className="mt-1 max-w-2xl text-base leading-6 text-muted-foreground">
                    {product.tagline}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] font-medium text-muted-foreground">
                  <ProductShareMenu
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
            <div className="flex w-full flex-wrap gap-3 md:ml-auto md:w-auto md:justify-end">
              {websiteHref ? (
                <ProductWebsiteLink
                  href={websiteHref}
                  productSlug={product.slug}
                  trackWithBeacon={hasDirectWebsiteLink}
                  rel={websiteRel}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 text-sm font-semibold text-foreground transition hover:bg-muted/60 sm:flex-none"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Visit website
                </ProductWebsiteLink>
              ) : null}
              {videoHref ? (
                <a
                  href={videoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 text-sm font-semibold text-foreground transition hover:bg-muted/60 sm:flex-none"
                >
                  <PlayCircle className="h-4 w-4" aria-hidden />
                  Video
                </a>
              ) : null}
              <ProductUpvoteBadgeServer
                productSlug={product.slug}
                upvoteCount={upvoteCount}
                leaderboard={leaderboardPayload}
                variant="inline"
              />
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
              <ProductMediaGallery
                bannerImage={product.bannerImage}
                directInitialImage={directInitialGalleryImage}
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
                        href={tagPath(tag.slug)}
                        className="rounded-sm border border-border bg-[#f8fafc] px-3 py-1 text-[11px] font-medium uppercase text-muted-foreground transition hover:border-[#0051d5]/40 hover:text-[#0051d5]"
                      >
                        #{tag.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </section>
              {visibleInternalLinks.length ? (
                <nav
                  aria-label={`Research paths related to ${product.name}`}
                  className="rounded-xl border border-border bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Continue researching {product.name}
                      </h2>
                      <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                        Compare {product.name} by category, use case, maker,
                        pricing, platform support, alternatives, and launch
                        context.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {visibleInternalLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          title={link.description}
                          className="group flex min-w-0 items-start justify-between gap-3 rounded-lg border border-border bg-[#f8fafc] px-3 py-3 transition hover:border-[#0051d5]/30 hover:bg-white"
                        >
                          <span className="min-w-0">
                            <span className="line-clamp-1 block text-sm font-semibold text-foreground group-hover:text-[#0051d5]">
                              {link.label}
                            </span>
                            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                              {link.description}
                            </span>
                          </span>
                          <ArrowRight
                            className="mt-1 size-3.5 shrink-0 text-muted-foreground transition group-hover:text-[#0051d5]"
                            aria-hidden
                          />
                        </Link>
                      ))}
                    </div>
                  </div>

                  {overflowInternalLinkGroups.length ? (
                    <details className="group mt-3">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-[#0051d5]">
                        <span>
                          {`Show all research paths (${overflowInternalLinkCount})`}
                        </span>
                        <ArrowRight
                          className="size-3 transition group-open:rotate-90"
                          aria-hidden
                        />
                      </summary>
                      <div className="mt-3 grid gap-x-6 gap-y-4 border-t border-border pt-3 sm:grid-cols-2">
                        {overflowInternalLinkGroups.map((group) => (
                          <section key={group.title} aria-label={group.title}>
                            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              {group.title}
                            </h3>
                            <ul className="mt-2 space-y-2">
                              {group.links.map((link) => (
                                <li key={link.href}>
                                  <Link
                                    href={link.href}
                                    title={link.description}
                                    className="group/link block rounded-md px-1 py-0.5 transition hover:bg-[#f8fafc]"
                                  >
                                    <span className="block text-xs font-semibold text-foreground underline-offset-4 group-hover/link:text-[#0051d5] group-hover/link:underline">
                                      {link.label}
                                    </span>
                                    <span className="mt-0.5 line-clamp-2 block text-[11px] leading-4 text-muted-foreground">
                                      {link.description}
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </section>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </nav>
              ) : null}
            </div>

            <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4">
              {hasMeaningfulLeaderboardMetrics ? (
                <section
                  className={cn(
                    "grid gap-3",
                    leaderboardRank !== null ? "grid-cols-2" : "grid-cols-1",
                  )}
                >
                  {leaderboardRank !== null ? (
                    <div className="rounded-xl border border-border bg-white p-4 text-center shadow-sm">
                      <span className="mb-1 block text-[11px] font-medium uppercase text-muted-foreground">
                        Global rank
                      </span>
                      <span className="text-lg font-semibold text-foreground">
                        #{numberFormatter.format(leaderboardRank)}
                      </span>
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-border bg-white p-4 text-center shadow-sm">
                    <span className="mb-1 block text-[11px] font-medium uppercase text-muted-foreground">
                      Shipyard points
                    </span>
                    <span className="text-lg font-semibold text-emerald-700">
                      {numberFormatter.format(leaderboardPoints)}
                    </span>
                  </div>
                </section>
              ) : null}
              {productDetailsCard}
              {productPromotionSlot}
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  You may also like
                </h2>
                {primaryUseCaseSlug || primaryCategorySlug ? (
                  similarProductsContent
                ) : (
                  <p className="rounded-lg border border-border bg-white p-4 text-sm text-muted-foreground">
                    Related launches will appear as soon as this product has a
                    category or use case.
                  </p>
                )}
              </section>
            </aside>
          </div>
        </div>
      </PublicAdLayout>
    </main>
  )
}
