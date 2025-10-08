import Link from "next/link"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import { JSX } from "react"

import { hasUserUpvoted } from "@/actions/public/products/actions"
import { auth } from "@clerk/nextjs/server"
import { BADGE_OPTIONS } from "@/lib/constants"
import { getLiveUpvoteCount } from "@/lib/server/productVotesStore"
import { badgeColorMap, TailwindColor } from "@/lib/utils"
import {
  getPublicProductBySlug,
  getPublicProductsByUseCase,
  getPublicProductMetaBySlug,
} from "@/actions/public/products/actions"
import {
  ExternalLink,
  Github,
  Twitter,
  Mail,
  Globe,
  Apple,
  Smartphone,
  Monitor,
  Laptop,
  Terminal,
  Chrome,
} from "lucide-react"
import { IconBrandFirefox } from "@tabler/icons-react"
import { productPageCopy } from "@/lib/copy/productPage"
import ExternalBadgeLink from "@/components/molecules/ExternalBadgeLink"
import { addUtmParams } from "@/lib/marketing/utm"
import { hasPlanFeature } from "@/lib/features"
import ProductMetricsTracker from "@/components/pages/ProductMetricsTracker"
import { buildPageMetadata } from "@/lib/metadata"
import { ScrollReset } from "@/components/atoms/scroll-reset"
import { BROWSE_PATH, categoryPath, productPath, userPath } from "@/lib/routes"
import { SupportHeroCard } from "@/components/molecules/SupportHeroCard"
import { NewsletterSignupSidebarCard } from "@/components/molecules/NewsletterSignupSidebarCard"
import ProductReviewsSection from "@/components/organisms/ProductReviewsSection"
import { ProductDetailHero } from "@/components/organisms/ProductDetailHero"
import { ProductMediaGallery } from "@/components/organisms/ProductMediaGallery"
import { ProductNarrative } from "@/components/organisms/ProductNarrative"
import { ProductCrewRoster } from "@/components/organisms/ProductCrewRoster"
import { ProductSimilarVoyages } from "@/components/organisms/ProductSimilarVoyages"
import { NewsletterSignupSection } from "@/components/organisms/NewsletterSignupSection"

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

type UseCaseProduct = Awaited<
  ReturnType<typeof getPublicProductsByUseCase>
>[number]

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

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getPublicProductMetaBySlug(slug)
  if (!product) return {}
  const relativeUrl = productPath(product.slug)
  const desc = product.tagline || product.description || undefined
  const imageEntries = (
    [
      product.bannerImage
        ? { url: product.bannerImage, alt: `${product.name} banner` }
        : null,
      product.logo ? { url: product.logo, alt: `${product.name} logo` } : null,
    ] as Array<{ url: string; alt: string } | null>
  )
    .filter((entry): entry is { url: string; alt: string } => Boolean(entry))
    .filter(
      (entry, index, entries) =>
        entries.findIndex((candidate) => candidate.url === entry.url) === index,
    )
  const authorName =
    [product.user?.firstName || "", product.user?.lastName || ""]
      .join(" ")
      .trim() || undefined

  const openGraphExtras = {
    url: relativeUrl,
    type: "website" as const,
    ...(imageEntries.length ? { images: imageEntries } : {}),
  }

  const twitterExtras = {
    card: "summary_large_image" as const,
    ...(imageEntries.length
      ? {
          images: imageEntries.map(({ url, alt }) => ({ url, alt })),
        }
      : {}),
  }

  const baseMetadata = buildPageMetadata({
    title: product.name,
    section: "Product",
    description: desc,
    openGraph: openGraphExtras,
    twitter: twitterExtras,
  })

  const robotsConfig =
    product.status === "published"
      ? { index: true, follow: true }
      : { index: false, follow: false }

  const keywords =
    product.keywords && product.keywords.length ? product.keywords : undefined

  return {
    ...baseMetadata,
    alternates: { canonical: relativeUrl },
    robots: robotsConfig,
    ...(keywords ? { keywords } : {}),
    ...(authorName ? { authors: [{ name: authorName }] } : {}),
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getPublicProductBySlug(slug)
  if (!product) return notFound()

  const isVerified = product.verification?.isVerified
  const authResult = await auth()

  const userId = authResult.userId
  const liveUpvotesPromise = getLiveUpvoteCount(product.id)
  const userUpvotedPromise = userId
    ? await hasUserUpvoted(product.id, userId)
    : Promise.resolve(false)
  const [upvoteCount, userUpvoted] = await Promise.all([
    liveUpvotesPromise,
    userUpvotedPromise,
  ])

  const activeBadgeDefs = (product.badges || [])
    .map((b) => BADGE_OPTIONS.find((x) => x.value === b))
    .filter(Boolean) as typeof BADGE_OPTIONS
  const heroBadges = activeBadgeDefs.map((badge) => ({
    id: badge.value,
    label: badge.label,
    icon: <span aria-hidden>{badge.icon}</span>,
    className: badgeColorMap[badge.color as TailwindColor],
  }))

  const pricingDisplay =
    product.startingPriceCents !== null &&
    product.startingPriceCents !== undefined
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: product.currencyCode || "USD",
        }).format(product.startingPriceCents / 100)
      : null

  const heroStats: { label: string; value: string }[] = [
    {
      label: "Product type",
      value: PRODUCT_TYPE_LABELS[product.type] || formatStatValue(product.type),
    },
  ]
  if (product.pricingModel) {
    heroStats.push({
      label: "Pricing model",
      value:
        PRICING_MODEL_LABELS[product.pricingModel] ||
        formatStatValue(product.pricingModel),
    })
  }
  if (pricingDisplay) {
    heroStats.push({ label: "Starting at", value: pricingDisplay })
  }
  const launchDate = product.publishedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(product.publishedAt))
    : null
  if (launchDate) {
    heroStats.push({ label: "Launched", value: launchDate })
  }

  const withUtm = (url: string, content: string) =>
    addUtmParams(url, {
      source: "shipyard",
      medium: "referral",
      campaign: product.metadata?.utmCampaign || undefined,
      content,
    })

  const entitlementFeatures = new Set(product.activeFeatureEntitlements ?? [])

  const hasBacklinkFeature =
    hasPlanFeature(product.plan, "backlink") ||
    entitlementFeatures.has("backlink")
  const hasCustomCtaFeature =
    hasPlanFeature(product.plan, "customCTA") ||
    entitlementFeatures.has("customCTA")

  const ctaLabel = product.ctaLabel?.trim() || ""
  const ctaUrl = product.ctaUrl?.trim() || ""
  const hasCtaContent = Boolean(ctaLabel || ctaUrl)
  const showProminentCta = hasCustomCtaFeature && hasCtaContent
  const normalizedCtaHref = ctaUrl
    ? hasBacklinkFeature
      ? withUtm(ctaUrl, "cta")
      : ctaUrl
    : null
  const primaryLinks: JSX.Element[] = []
  if (showProminentCta && normalizedCtaHref) {
    primaryLinks.push(
      <ExternalBadgeLink
        key="cta-primary"
        href={normalizedCtaHref}
        productId={hasBacklinkFeature ? undefined : product.id}
        follow={hasBacklinkFeature}
        target={hasBacklinkFeature ? "_blank" : undefined}
        rel={hasBacklinkFeature ? "noopener" : undefined}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
      >
        {ctaLabel || `Get started with ${product.name}`}
      </ExternalBadgeLink>,
    )
  }
  if (product.websiteUrl) {
    primaryLinks.push(
      <ExternalBadgeLink
        key="website"
        href={
          hasBacklinkFeature
            ? withUtm(product.websiteUrl, "visit-website")
            : product.websiteUrl
        }
        productId={hasBacklinkFeature ? undefined : product.id}
        follow={hasBacklinkFeature}
        target={hasBacklinkFeature ? "_blank" : undefined}
        rel={hasBacklinkFeature ? "noopener" : undefined}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
      >
        <span className="flex items-center gap-1">
          <ExternalLink size={14} /> Visit website
        </span>
      </ExternalBadgeLink>,
    )
  }
  if (product.metadata?.demoUrl) {
    primaryLinks.push(
      <ExternalBadgeLink
        key="demo"
        href={
          hasBacklinkFeature
            ? withUtm(product.metadata.demoUrl, "demo")
            : product.metadata.demoUrl
        }
        productId={hasBacklinkFeature ? undefined : product.id}
        follow={hasBacklinkFeature}
        target={hasBacklinkFeature ? "_blank" : undefined}
        rel={hasBacklinkFeature ? "noopener" : undefined}
        variant="outline"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition hover:text-foreground"
      >
        Live demo
      </ExternalBadgeLink>,
    )
  }

  const secondaryLinks = [
    product.metadata?.githubUrl && {
      href: product.metadata.githubUrl,
      label: "GitHub",
      icon: <Github className="h-4 w-4" aria-hidden />,
    },
    product.metadata?.twitterUrl && {
      href: product.metadata.twitterUrl,
      label: "Twitter",
      icon: <Twitter className="h-4 w-4" aria-hidden />,
    },
    product.metadata?.contactEmail && {
      href: `mailto:${product.metadata.contactEmail}`,
      label: "Contact",
      icon: <Mail className="h-4 w-4" aria-hidden />,
    },
  ].filter(Boolean) as { href: string; label: string; icon: JSX.Element }[]

  const crewMembers = product.organization?.memberships || []
  const platforms = product.platforms || []

  const reviewSummaryPromise = getProductReviewSummary(product.id, 12)
  const viewerReviewPromise = userId
    ? getUserProductReview(product.id, userId).catch(() => null)
    : Promise.resolve(null)

  const [reviewSummary, viewerReview] = await Promise.all([
    reviewSummaryPromise,
    viewerReviewPromise,
  ])

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev"
  ).replace(/\/$/, "")
  const canonicalUrl = `${baseUrl}${productPath(product.slug)}`
  const structuredData =
    reviewSummary.totalReviews > 0
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.tagline || undefined,
          image: [product.bannerImage, product.logo].filter(Boolean),
          url: canonicalUrl,
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewSummary.averageRating.toFixed(1),
            reviewCount: reviewSummary.totalReviews,
            bestRating: 5,
            worstRating: 0,
          },
          review: reviewSummary.reviews.map((review) => ({
            "@type": "Review",
            author: {
              "@type": "Person",
              name: reviewerDisplayName(
                review.user.firstName,
                review.user.lastName,
              ),
            },
            datePublished: (() => {
              try {
                return new Date(review.createdAt).toISOString()
              } catch {
                return undefined
              }
            })(),
            reviewBody: review.message,
            name: `Feedback for ${product.name}`,
            reviewRating: {
              "@type": "Rating",
              ratingValue: review.rating,
              bestRating: 5,
              worstRating: 0,
            },
          })),
        }
      : null

  const useCaseProducts = product.category.useCases?.length
    ? await getPublicProductsByUseCase(
        product.category.useCases[0].useCase.slug,
        product.id,
      )
    : []

  const useCaseItems = useCaseProducts.map((item: UseCaseProduct) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    logo: item.logo,
    tagline: item.tagline,
    analytics: item.analytics
      ? {
          upvotes: item.analytics.upvotes ?? 0,
        }
      : undefined,
    category: item.category ?? undefined,
  }))

  const ownerName = reviewerDisplayName(
    product.user?.firstName,
    product.user?.lastName,
  )

  const supportCard = (
    <SupportHeroCard
      productId={product.id}
      productName={product.name}
      initialCount={upvoteCount}
      initialUpvoted={userUpvoted}
      isSignedIn={Boolean(userId)}
    />
  )

  const useCase = product.category.useCases?.[0]?.useCase || null

  const heroPlatforms = platforms.map((p) => ({
    id: p,
    label: p.replaceAll("_", " "),
    icon: platformIcon(p),
  }))

  const signalTags = (product.keywords || []).map((keyword) => ({
    id: keyword,
    label: keyword,
    href: `${BROWSE_PATH}?q=${encodeURIComponent(keyword)}`,
  }))

  const crewRoster = crewMembers.map((member) => ({
    id: member.id,
    name: reviewerDisplayName(member.user.firstName, member.user.lastName),
    jobTitle: member.jobTitle,
  }))

  const hasCrewDetails =
    crewRoster.length > 0 || Boolean(product.organization?.name)

  return (
    <main className="relative isolate bg-white">
      {structuredData ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <ScrollReset triggerKey={product.slug} />
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <ProductMetricsTracker productId={product.id} />

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,2.4fr)_minmax(260px,1fr)] xl:grid-cols-[minmax(0,2.8fr)_minmax(260px,1fr)]">
          <div className="space-y-10">
            <ProductDetailHero
              name={product.name}
              tagline={product.tagline}
              logo={product.logo}
              category={{
                label: product.category.name,
                href: categoryPath(product.category.slug),
              }}
              owner={{
                name: ownerName,
                href: userPath(product.user.id),
              }}
              badges={heroBadges}
              isVerified={Boolean(isVerified)}
              primaryLinks={primaryLinks}
              platforms={heroPlatforms}
              tags={signalTags}
              reviewPrompt={{
                isSignedIn: Boolean(userId),
                redirectUrl: productPath(product.slug),
                hasReviews: reviewSummary.totalReviews > 0,
              }}
            />

            <ProductMediaGallery
              bannerImage={product.bannerImage}
              media={product.ProductMedia.map((m) => ({
                id: m.id,
                imageUrl: m.imageUrl,
                altText: m.altText,
              }))}
              productName={product.name}
            />

            <ProductNarrative description={product.description} />

            <ProductReviewsSection
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
              isSignedIn={Boolean(userId)}
              redirectUrl={productPath(product.slug)}
            />
          </div>

          <aside className="space-y-6">
            {supportCard}
            {heroStats.length ? (
              <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                  {productPageCopy.hero.statsLabel}
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  {heroStats.map((stat) => (
                    <div key={stat.label} className="space-y-1">
                      <dt className="uppercase tracking-[0.18em] text-[11px] text-muted-foreground">
                        {stat.label}
                      </dt>
                      <dd className="text-sm font-semibold text-foreground">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {secondaryLinks.length ? (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                  Signal links
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {secondaryLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {hasCrewDetails ? (
              <ProductCrewRoster
                members={crewRoster}
                organizationName={product.organization?.name}
              />
            ) : null}

            <NewsletterSignupSidebarCard />

            <ProductSimilarVoyages
              items={useCaseItems}
              headingSuffix={useCase?.label || null}
              browseHref={`${BROWSE_PATH}?useCase=${useCase?.slug || ""}`}
            />
          </aside>
        </div>

        <div className="mt-12">
          <NewsletterSignupSection className="rounded-3xl border border-border bg-white shadow-sm" />
        </div>
      </div>
    </main>
  )
}

function formatStatValue(raw: string) {
  const normalized = raw.replace(/[-_]+/g, " ").trim()
  if (!normalized) return raw

  return normalized
    .split(/\s+/)
    .map((segment) => {
      const upperSegment = segment.toUpperCase()
      if (segment.length <= 3 && /^[A-Z0-9]+$/.test(segment)) {
        return upperSegment
      }
      return upperSegment.charAt(0) + upperSegment.slice(1).toLowerCase()
    })
    .join(" ")
}

function platformIcon(platform: string) {
  switch (platform) {
    case "web":
      return <Globe className="size-3" />
    case "ios":
      return <Apple className="size-3" />
    case "android":
      return <Smartphone className="size-3" />
    case "mac":
      return <Monitor className="size-3" />
    case "windows":
      return <Laptop className="size-3" />
    case "linux":
      return <Terminal className="size-3" />
    case "chrome_extension":
      return <Chrome className="size-3" />
    case "firefox_extension":
      return <IconBrandFirefox className="size-3" />
    default:
      return null
  }
}

async function getProductReviewSummary(productId: string, take = 12) {
  const { getProductReviewSummary } = await import(
    "@/lib/server/productReviews"
  )
  return getProductReviewSummary(productId, take)
}

async function getUserProductReview(productId: string, userId: string) {
  const { getUserProductReview } = await import("@/lib/server/productReviews")
  return getUserProductReview(productId, userId)
}

function reviewerDisplayName(first?: string | null, last?: string | null) {
  const parts = [first?.trim(), last?.trim()].filter(Boolean)
  return parts.length ? parts.join(" ") : "Shipyard member"
}
