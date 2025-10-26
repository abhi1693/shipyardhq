import Link from "next/link"
import { notFound } from "next/navigation"
import { JSX } from "react"

import { auth } from "@clerk/nextjs/server"
import { BADGE_OPTIONS } from "@/lib/constants"
import {
  getLiveUpvoteCount,
  resolveVoteState,
} from "@/lib/server/productVotesStore"
import { badgeColorMap, TailwindColor } from "@/lib/utils"
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
import SignInButton from "@/components/molecules/SignInButton"
import { addUtmParams } from "@/lib/marketing/utm"
import { hasPlanFeature } from "@/lib/features"
import ProductMetricsTracker from "@/components/pages/ProductMetricsTracker"
import { ScrollReset } from "@/components/atoms/scroll-reset"
import { Button } from "@/components/atoms/button"
import {
  BROWSE_PATH,
  categoryPath,
  productPath,
  productUpdatesPath,
  userPath,
  productClaimPath,
} from "@/lib/routes"
import { SupportHeroCard } from "@/components/molecules/SupportHeroCard"
import { NewsletterSignupSidebarCard } from "@/components/molecules/NewsletterSignupSidebarCard"
import ProductReviewsSection from "@/components/organisms/ProductReviewsSection"
import { ProductDetailHero } from "@/components/organisms/ProductDetailHero"
import { ProductMediaGallery } from "@/components/organisms/ProductMediaGallery"
import { ProductNarrative } from "@/components/organisms/ProductNarrative"
import { ProductChangelog } from "@/components/organisms/ProductChangelog"
import { ProductCrewRoster } from "@/components/organisms/ProductCrewRoster"
import { ProductSimilarVoyages } from "@/components/organisms/ProductSimilarVoyages"
import HeroStickyBanner from "@/components/layout/HeroStickyBanner"
import { ProductAlternativesSection } from "@/components/organisms/ProductAlternativesSection"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { queueProductViewReward } from "@/lib/server/rewards/engagement"
import {
  getProductPagePayload,
  reviewerDisplayName,
} from "@/lib/products/page-cache"
import {
  evaluateClaimEligibility,
  isProductClaimableInGeneral,
} from "@/lib/products/claim"

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

export async function ProductDetailPageContent({ params }: ProductPageProps) {
  const { slug } = await params
  const payload = await getProductPagePayload(slug)
  if (!payload) return notFound()

  const {
    product,
    reviewSummary,
    productUpdates,
    hasAdditionalUpdates,
    similarProducts,
    similarUseCase,
    structuredData,
  } = payload

  const isVerified = product.verification?.isVerified
  const authResult = await auth()

  const clerkUserId = authResult.userId
  const viewer = clerkUserId ? await getActiveUserByClerkId(clerkUserId) : null
  const userId = viewer?.id ?? null
  const liveUpvotesPromise = getLiveUpvoteCount(product.id)
  const userUpvotedPromise = userId
    ? resolveVoteState(product.id, userId).then(
        ({ currentState }) => currentState === "upvoted",
      )
    : Promise.resolve(false)
  const [upvoteCount, userUpvoted] = await Promise.all([
    liveUpvotesPromise,
    userUpvotedPromise,
  ])

  if (userId && userId !== (product.user?.id ?? null)) {
    queueProductViewReward({
      userId,
      productId: product.id,
      productSlug: product.slug,
    })
  }

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
  const externalCtaTarget = "_blank" as const
  const primaryLinks: JSX.Element[] = []
  if (showProminentCta && normalizedCtaHref) {
    primaryLinks.push(
      <ExternalBadgeLink
        key="cta-primary"
        href={normalizedCtaHref}
        productId={hasBacklinkFeature ? undefined : product.id}
        follow={hasBacklinkFeature}
        target={externalCtaTarget}
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
        target={externalCtaTarget}
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
        target={externalCtaTarget}
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

  const viewerReviewPromise = userId
    ? getUserProductReview(product.id, userId).catch(() => null)
    : Promise.resolve(null)
  const viewerReview = await viewerReviewPromise

  const structuredDataJson = structuredData
    ? JSON.stringify(structuredData).replace(/</g, "\\u003c")
    : null

  const useCaseItems = similarProducts

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

  const useCase = similarUseCase

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

  const isClaimable = isProductClaimableInGeneral({
    isVerified: product.verification?.isVerified ?? false,
    productStatus: product.status,
  })

  const claimEligibilityForViewer =
    viewer && isClaimable
      ? evaluateClaimEligibility({
          submitterId: product.user?.id ?? null,
          viewerId: viewer.id,
          productStatus: product.status,
          isVerified: product.verification?.isVerified ?? false,
        })
      : null
  let claimLink: JSX.Element | null = null
  if (isClaimable) {
    const claimHref = productClaimPath(product.slug)
    if (!viewer) {
      claimLink = (
        <SignInButton
          mode="modal"
          forceRedirectUrl={claimHref}
          signUpForceRedirectUrl={claimHref}
        >
          <Button
            variant="outline"
            className="border border-border bg-white text-foreground shadow-sm hover:bg-muted"
          >
            Claim this product
          </Button>
        </SignInButton>
      )
    } else if (claimEligibilityForViewer?.status === "eligible") {
      claimLink = (
        <Button
          asChild
          variant="outline"
          className="border border-border bg-white text-foreground shadow-sm hover:bg-muted"
        >
          <Link href={claimHref}>Claim this product</Link>
        </Button>
      )
    }
  }

  return (
    <main className="relative isolate bg-white">
      {structuredDataJson ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: structuredDataJson,
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
              claimLink={claimLink}
              platforms={heroPlatforms}
              tags={signalTags}
              reviewPrompt={{
                isSignedIn: Boolean(userId),
                redirectUrl: productPath(product.slug),
                hasReviews: reviewSummary.totalReviews > 0,
              }}
            />

            <HeroStickyBanner
              wrapperClassName="px-0"
              innerClassName="max-w-[120rem]"
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

            {productUpdates.length ? (
              <ProductChangelog
                productName={product.name}
                updates={productUpdates}
                footer={
                  hasAdditionalUpdates ? (
                    <Link
                      href={productUpdatesPath(product.slug)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      View all updates
                    </Link>
                  ) : undefined
                }
              />
            ) : null}

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
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/75">
                  <span
                    className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                    aria-hidden
                  />
                  {productPageCopy.hero.statsLabel}
                </p>
                <dl className="mt-4 grid gap-3">
                  {heroStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-border/70 bg-white px-4 py-3 shadow-sm"
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                        {stat.label}
                      </dt>
                      <dd className="mt-1 text-lg font-semibold leading-tight text-foreground">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
            <ProductAlternativesSection
              alternatives={product.alternatives || []}
            />

            {secondaryLinks.length ? (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/75">
                  <span
                    className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                    aria-hidden
                  />
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
      const trimmed = segment.trim()
      if (!trimmed) return ""
      const upper = trimmed.toUpperCase()
      if (trimmed.length <= 3 && /^[A-Z0-9]+$/.test(upper)) {
        return upper
      }
      return `${upper.charAt(0)}${upper.slice(1).toLowerCase()}`
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

async function getUserProductReview(productId: string, userId: string) {
  const { getUserProductReview } = await import("@/lib/server/productReviews")
  return getUserProductReview(productId, userId)
}
