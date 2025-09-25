import { notFound } from "next/navigation"
import { Metadata } from "next"
import { JSX } from "react"

import { upvoteProductAction } from "@/actions/public/products/upvote"
import { hasUserUpvoted } from "@/actions/public/products/actions"
import { auth } from "@clerk/nextjs/server"
import { BADGE_OPTIONS } from "@/lib/constants"
import { badgeColorMap, TailwindColor } from "@/lib/utils"
import {
  getPublicProductBySlug,
  getPublicProductsByUseCase,
} from "@/actions/public/products/actions"
import { getPublicProductMetaBySlug } from "@/actions/public/products/actions"
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
import PublicContainer from "@/components/layout/PublicContainer"
import ExternalBadgeLink from "@/components/molecules/ExternalBadgeLink"
import { addUtmParams } from "@/lib/marketing/utm"
import { hasPlanFeature } from "@/lib/features"
import ProductMetricsTracker from "@/components/pages/ProductMetricsTracker"
import { buildPageMetadata } from "@/lib/metadata"
import { ScrollReset } from "@/components/atoms/scroll-reset"
import { BROWSE_PATH, categoryPath, productPath, userPath } from "@/lib/routes"
import { SupportHeroCard } from "@/components/molecules/SupportHeroCard"
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

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getPublicProductMetaBySlug(slug)
  if (!product) return {}
  const relativeUrl = productPath(product.slug)
  const desc = product.tagline || product.description || undefined
  const images = [product.bannerImage, product.logo].filter(Boolean) as string[]
  const authorName =
    [product.user?.firstName || "", product.user?.lastName || ""]
      .join(" ")
      .trim() || undefined

  const openGraphExtras = {
    url: relativeUrl,
    type: "website" as const,
    ...(images.length ? { images: images.map((url) => ({ url })) } : {}),
  }

  const twitterExtras = {
    card: "summary_large_image" as const,
    ...(images.length ? { images } : {}),
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
  const stats = product.analytics
  const authResult = await auth()

  const userId = authResult.userId
  const userUpvoted = userId ? await hasUserUpvoted(product.id, userId) : false

  const activeBadgeDefs = (product.badges || [])
    .map((b) => BADGE_OPTIONS.find((x) => x.value === b))
    .filter(Boolean) as typeof BADGE_OPTIONS
  const heroBadges = activeBadgeDefs.map((badge) => ({
    id: badge.value,
    label: badge.label,
    icon: <span aria-hidden>{badge.icon}</span>,
    className: badgeColorMap[badge.color as TailwindColor],
  }))

  const upvoteCount = stats?.upvotes ?? 0
  const pricingDisplay =
    product.startingPriceCents !== null &&
    product.startingPriceCents !== undefined
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: product.currencyCode || "USD",
        }).format(product.startingPriceCents / 100)
      : null

  const heroStats: { label: string; value: string }[] = [
    { label: "Product type", value: product.type.replaceAll("_", " ") },
  ]
  if (product.pricingModel) {
    heroStats.push({ label: "Pricing model", value: product.pricingModel })
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

  const hasBacklinkFeature = hasPlanFeature(product.plan, "backlink")
  const hasCustomCtaFeature = hasPlanFeature(product.plan, "customCTA")

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
        className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--brand-2)] px-5 text-sm font-semibold text-white shadow-[0px_25px_70px_-40px_rgba(7,78,134,0.5)] transition hover:bg-[color:var(--brand-2)/0.9]"
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
        className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--brand-1)]/90 px-5 text-sm font-semibold text-white shadow-[0px_22px_60px_-40px_rgba(7,58,104,0.55)] transition hover:bg-[color:var(--brand-1)]"
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
        className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.25] bg-white/40 px-5 text-sm font-semibold text-[color:var(--brand-1)] transition hover:border-[color:var(--brand-1)/0.4] hover:bg-white/70"
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

  const hasBanner = Boolean(product.bannerImage)
  const hasGallery = product.ProductMedia.length > 0
  const hasMedia = hasBanner || hasGallery
  const hasDescription = Boolean(product.description)
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
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.com"
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
      action={upvoteProductAction}
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

  return (
    <main className="relative isolate overflow-hidden">
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,#f6f9ff_0%,#e7f1fc_45%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#050c18_0%,#041226_45%,#081c34_100%)]"
      />

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        fillScreen={false}
        className="relative"
        innerClassName="space-y-12"
      >
        <ProductMetricsTracker productId={product.id} />
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
          secondaryLinks={secondaryLinks}
          platforms={heroPlatforms}
          tags={signalTags}
          stats={heroStats}
          supportCard={supportCard}
          reviewPrompt={{
            isSignedIn: Boolean(userId),
            redirectUrl: productPath(product.slug),
            hasReviews: reviewSummary.totalReviews > 0,
          }}
        />
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-10"
        fillScreen={false}
        className="relative"
        innerClassName="space-y-10"
      >
        {hasMedia ? (
          <ProductMediaGallery
            bannerImage={product.bannerImage}
            media={product.ProductMedia.map((m) => ({
              id: m.id,
              imageUrl: m.imageUrl,
              altText: m.altText,
            }))}
            productName={product.name}
          />
        ) : null}
        <ProductNarrative
          description={hasDescription ? product.description : null}
        />
        <ProductReviewsSection
          productId={product.id}
          productName={product.name}
          reviewSummary={reviewSummary}
          viewerReview={
            viewerReview
              ? { rating: viewerReview.rating, message: viewerReview.message }
              : null
          }
          isSignedIn={Boolean(userId)}
          redirectUrl={productPath(product.slug)}
        />
        <ProductCrewRoster
          members={crewRoster}
          organizationName={product.organization?.name}
        />
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        fillScreen={false}
        className="relative"
        innerClassName="space-y-12"
      >
        <ProductSimilarVoyages
          items={useCaseItems}
          headingSuffix={useCase?.label || null}
          browseHref={`${BROWSE_PATH}?useCase=${useCase?.slug || ""}`}
        />
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
