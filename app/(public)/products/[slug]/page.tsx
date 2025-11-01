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
  Monitor,
  PlayCircle,
  Smartphone,
  Sparkles,
  Terminal,
} from "lucide-react"
import { auth } from "@clerk/nextjs/server"

import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import ProductUpvoteBadge from "@/components/molecules/ProductUpvoteBadge"
import ProductShareBar from "@/components/molecules/ProductShareBar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import {
  getPublicProductMetaBySlug,
  hasUserUpvoted,
  getPublicProductBySlug,
} from "@/actions/public/products/actions"
import { categoryPath, userPath } from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"
import { ensureUrlHasSchema } from "@/lib/utils"
import { addUtmParams } from "@/lib/marketing/utm"
import { hasPlanFeature } from "@/lib/features"
import { BADGE_OPTIONS } from "@/lib/constants"

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

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params
  const [product, sidebarProduct] = await Promise.all([
    getPublicProductMetaBySlug(slug),
    getPublicProductBySlug(slug),
  ])
  if (!product) return notFound()

  const { userId: clerkUserId } = auth()
  const viewerUpvoted = clerkUserId
    ? await hasUserUpvoted(product.id, clerkUserId)
    : false

  const ownerName = [product.user?.firstName, product.user?.lastName]
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
  const productTypeLabel = sidebarProduct?.type
    ? PRODUCT_TYPE_LABELS[sidebarProduct.type] ??
      formatLabel(sidebarProduct.type)
    : null
  const pricingModelLabel = sidebarProduct?.pricingModel
    ? PRICING_MODEL_LABELS[sidebarProduct.pricingModel] ??
      formatLabel(sidebarProduct.pricingModel)
    : null
  const categoryLabel = product.category?.name ?? null
  const startingPrice =
    typeof sidebarProduct?.startingPriceCents === "number"
      ? formatCurrency(
          sidebarProduct.startingPriceCents,
          sidebarProduct.currencyCode,
        )
      : null
  const platformItems = (sidebarProduct?.platforms ?? [])
    .map((platform) => {
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
  const activeBadgeDefs = (sidebarProduct?.badges ?? [])
    .map((badgeKey) => BADGE_LOOKUP[badgeKey])
    .filter(Boolean)
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
  const normalizedCtaUrl = rawCtaUrl
    ? ensureUrlHasSchema(rawCtaUrl)
    : null
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
  const effectiveCtaLabel =
    ctaLabel || `Get started with ${product.name}`
  const quickLinkClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm shadow-black/5 transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  const primaryQuickLinkClass =
    "inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm shadow-black/10 transition-colors hover:bg-foreground/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

  return (
    <main className="bg-white">
      <PublicTwoColumnLayout
        mainClassName="gap-8"
        sidebarClassName="lg:sticky lg:top-24"
        main={
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
                  {product.user?.id && ownerName ? (
                    <Link
                      href={userPath(product.user.id)}
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
          </header>
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
                          <TooltipContent sideOffset={6}>{badge.label}</TooltipContent>
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
