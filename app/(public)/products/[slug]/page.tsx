import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Metadata } from "next"
import { Badge } from "@/components/atoms/badge"
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
  CheckCircle,
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
  Star,
} from "lucide-react"
import PublicContainer from "@/components/layout/PublicContainer"
import ExternalBadgeLink from "@/components/molecules/ExternalBadgeLink"
import { ProductCompactGrid } from "@/components/molecules/ProductCompactGrid"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { IconBrandFirefox } from "@tabler/icons-react"
import { addUtmParams } from "@/lib/marketing/utm"
import { hasPlanFeature } from "@/lib/features"
import { JSX } from "react"
import ImageLightbox from "@/components/molecules/ImageLightbox"
import ProductMetricsTracker from "@/components/pages/ProductMetricsTracker"
import { buildPageMetadata } from "@/lib/metadata"
import { ScrollReset } from "@/components/atoms/scroll-reset"
import { BROWSE_PATH, categoryPath, productPath, userPath } from "@/lib/routes"
import { SupportHeroCard } from "@/components/molecules/SupportHeroCard"
import ProductReviewsSection from "@/components/organisms/ProductReviewsSection"
import {
  getProductReviewSummary,
  getUserProductReview,
} from "@/lib/server/productReviews"

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
  const upvoteCount = stats?.upvotes ?? 0
  const clickCount = stats?.clicks ?? 0
  const pricingDisplay =
    product.startingPriceCents !== null &&
    product.startingPriceCents !== undefined
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: product.currencyCode || "USD",
        }).format(product.startingPriceCents / 100)
      : null

  const platformIcon = (p: string) => {
    switch (p) {
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

  // Helper to append UTM params to outbound CTAs, keeping them do-follow.
  const withUtm = (url: string, content: string) =>
    addUtmParams(url, {
      source: "shipyard",
      medium: "referral",
      // Add campaign only if provided by user
      campaign: product.metadata?.utmCampaign || undefined,
      content,
    })

  // Plan features
  const hasBacklinkFeature = hasPlanFeature(product.plan, "backlink")
  const hasCustomCtaFeature = hasPlanFeature(product.plan, "customCTA")

  const heroStats: { label: string; value: string }[] = [
    { label: "Clicks recorded", value: clickCount.toLocaleString() },
  ]
  if (pricingDisplay) {
    heroStats.push({ label: "Starting at", value: pricingDisplay })
  }
  if (product.pricingModel) {
    heroStats.push({ label: "Pricing model", value: product.pricingModel })
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

  const useCases = product.category.useCases || []
  const hasUseCases = useCases.length > 0
  const primaryUseCase = useCases[0]?.useCase || null
  const primaryUseCaseSlug = primaryUseCase?.slug || null
  const primaryUseCaseLabel = primaryUseCase?.label || null

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
        className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.45] bg-[color:var(--brand-2)] px-5 py-2 text-sm font-semibold text-white shadow-[0px_20px_45px_-30px_rgba(7,78,134,0.55)] transition-colors hover:border-[color:var(--brand-2)/0.6] hover:bg-[color:var(--brand-2)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--brand-2)/0.5]"
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
        className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.35] bg-[color:var(--brand-1)] px-5 py-2 text-sm font-semibold text-white shadow-[0px_20px_45px_-30px_rgba(7,58,104,0.55)] transition-colors hover:bg-[rgba(7,58,104,0.9)] hover:border-[color:var(--brand-1)/0.5]"
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
        className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.35] bg-background/80 px-5 py-2 text-sm font-semibold text-[color:var(--brand-1)]"
      >
        Live demo
      </ExternalBadgeLink>,
    )
  }

  const secondaryLinks = [
    product.metadata?.githubUrl && {
      href: product.metadata.githubUrl,
      label: "GitHub",
      icon: <Github size={14} />,
    },
    product.metadata?.twitterUrl && {
      href: product.metadata.twitterUrl,
      label: "Twitter",
      icon: <Twitter size={14} />,
    },
    product.metadata?.contactEmail && {
      href: `mailto:${product.metadata.contactEmail}`,
      label: "Contact",
      icon: <Mail size={14} />,
    },
  ].filter(Boolean) as { href: string; label: string; icon: JSX.Element }[]

  const hasMetadataLinks = secondaryLinks.length > 0

  const crewMembers = product.organization?.memberships || []
  const hasCrew = crewMembers.length > 0

  const hasBanner = Boolean(product.bannerImage)
  const hasGallery = product.ProductMedia.length > 0
  const hasMedia = hasBanner || hasGallery
  const hasDescription = Boolean(product.description)
  const hasKeywords = Boolean(product.keywords && product.keywords.length > 0)
  const platforms = product.platforms || []

  const reviewSummaryPromise = getProductReviewSummary(product.id, 12)
  const viewerReviewPromise = userId
    ? getUserProductReview(product.id, userId).catch(() => null)
    : Promise.resolve(null)

  const [reviewSummary, viewerReview] = await Promise.all([
    reviewSummaryPromise,
    viewerReviewPromise,
  ])

  const reviewerDisplayName = (first?: string | null, last?: string | null) => {
    const parts = [first?.trim(), last?.trim()].filter(Boolean)
    return parts.length ? parts.join(" ") : "Shipyard member"
  }

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

  const useCaseProducts = primaryUseCaseSlug
    ? await getPublicProductsByUseCase(primaryUseCaseSlug, product.id)
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
  }))

  const hasUseCaseItems = useCaseItems.length > 0

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
        className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(248,252,255,0.95),rgba(232,243,251,0.9)45%,rgba(216,235,247,0.88))] dark:bg-[linear-gradient(180deg,rgba(5,13,24,0.92),rgba(3,22,40,0.9)45%,rgba(6,28,51,0.92))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_0%_0%,var(--brand-2)/0.12,transparent_70%),radial-gradient(90%_120%_at_100%_10%,var(--brand-3)/0.18,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(7, 58, 104, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(7, 58, 104, 0.04) 1px, transparent 1px)",
          backgroundSize: "180px 120px",
          maskImage:
            "radial-gradient(85% 120% at 50% 10%, rgba(0,0,0,0.9), transparent 70%)",
        }}
      />

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-20"
        fillScreen={false}
        className="relative"
      >
        <ProductMetricsTracker productId={product.id} />
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-[color:var(--brand-1)/0.2] bg-background/85 px-8 py-12 shadow-[0_35px_120px_-60px_rgba(7,58,104,0.65)] backdrop-blur">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-36 h-56 bg-[radial-gradient(120%_100%_at_50%_0%,var(--brand-1)/0.18,transparent_70%)] opacity-70"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[-30%] bottom-[-45%] h-[60%] rounded-[50%] bg-[radial-gradient(80%_120%_at_50%_50%,var(--brand-2)/0.16,transparent_75%)] opacity-60 blur-3xl"
            />
            <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
              <div className="space-y-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-3xl border border-[color:var(--brand-1)/0.25] bg-background shadow-[0_18px_35px_-20px_rgba(7,58,104,0.6)] sm:h-24 sm:w-24">
                    <Image
                      src={product.logo}
                      alt={product.name}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                      <span>Charted for</span>
                      <Link
                        href={categoryPath(product.category.slug)}
                        className="font-semibold tracking-[0.2em] underline decoration-[color:var(--brand-1)/0.45] underline-offset-4"
                      >
                        {product.category.name}
                      </Link>
                    </div>
                    <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl">
                      {product.name}
                    </h1>
                    <p className="text-base text-muted-foreground sm:text-lg">
                      {product.tagline}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={categoryPath(product.category.slug)}
                    className="inline-flex"
                  >
                    <Badge className="flex items-center gap-1 rounded-full border border-[color:var(--brand-1)/0.35] bg-background/80 px-3 py-1 text-xs font-semibold text-[color:var(--brand-1)]">
                      {product.category.name}
                    </Badge>
                  </Link>
                  <Badge className="rounded-full border border-[color:var(--brand-1)/0.2] bg-[color:var(--brand-1)/0.08] px-3 py-1 text-xs font-semibold text-[color:var(--brand-1)]">
                    {product.type.replaceAll("_", " ")}
                  </Badge>
                  {isVerified && (
                    <Badge className="flex items-center gap-1 rounded-full border border-[color:var(--brand-2)/0.4] bg-[color:var(--brand-2)/0.12] px-3 py-1 text-xs font-semibold text-[color:var(--brand-2)]">
                      <CheckCircle size={12} /> Verified domain
                    </Badge>
                  )}
                  {activeBadgeDefs.map((b) => (
                    <Badge
                      key={b.value}
                      className={badgeColorMap[b.color as TailwindColor]}
                    >
                      {b.icon} {b.label}
                    </Badge>
                  ))}
                </div>

                <div className="text-sm text-muted-foreground">
                  Skippered by{" "}
                  <Link
                    href={userPath(product.user.id)}
                    className="font-medium text-foreground underline decoration-dotted underline-offset-4"
                  >
                    {product.user.firstName} {product.user.lastName || ""}
                  </Link>
                </div>

                {primaryLinks.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {primaryLinks.map((link) => link)}
                  </div>
                )}

                {hasMetadataLinks && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Signal flags:
                    </span>
                    {secondaryLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand-1)/0.18] bg-background/70 px-3 py-1 text-[color:var(--brand-1)] transition-colors hover:border-[color:var(--brand-1)/0.35]"
                      >
                        {link.icon}
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}

                {hasUseCases && (
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                      Charted routes
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {useCases.map((uc) => (
                        <Link
                          key={`${uc.useCaseId}-${uc.categoryId}`}
                          href={{
                            pathname: BROWSE_PATH,
                            query: { useCase: uc.useCase.slug },
                          }}
                          className="inline-flex"
                        >
                          <Badge className="flex items-center gap-1 rounded-full border border-[color:var(--brand-1)/0.25] bg-background/75 px-3 py-1 text-xs text-[color:var(--brand-1)] shadow-[0_18px_32px_-25px_rgba(7,58,104,0.55)]">
                            <CheckCircle size={12} /> {uc.useCase.label}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {platforms.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                      Sails hoisted for
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {platforms.map((p) => (
                        <Badge
                          key={p}
                          variant="outline"
                          className="flex items-center gap-1 rounded-full border-[color:var(--brand-1)/0.25] bg-background/70 px-3 py-1 text-xs text-[color:var(--brand-1)]"
                        >
                          {platformIcon(p)} {p.replaceAll("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <aside className="flex h-full flex-col gap-5 rounded-[28px] border border-[color:var(--brand-1)/0.25] bg-background/88 p-6 shadow-[0_32px_80px_-55px_rgba(7,58,104,0.6)] backdrop-blur">
                <SupportHeroCard
                  productId={product.id}
                  productName={product.name}
                  initialCount={upvoteCount}
                  initialUpvoted={userUpvoted}
                  isSignedIn={Boolean(userId)}
                  action={upvoteProductAction}
                />
                <div className="grid gap-3">
                  {heroStats.map((stat) => (
                    <VoyageMetric
                      key={stat.label}
                      label={stat.label}
                      value={stat.value}
                    />
                  ))}
                </div>
                <Link
                  href="#product-reviews"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--brand-2)/0.3] bg-[color:var(--brand-2)] px-4 py-2 text-sm font-semibold text-white shadow-[0px_18px_40px_-30px_rgba(7,78,134,0.45)] transition-colors hover:border-[color:var(--brand-2)/0.5] hover:bg-[color:var(--brand-2)/0.9]"
                >
                  <Star size={16} /> Used this product? Share a review
                </Link>
              </aside>
            </div>
          </div>
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        fillScreen={false}
        className="relative"
      >
        <div className="mx-auto max-w-6xl space-y-12 px-4">
          {hasMedia && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-foreground">
                  Cargo hold
                </h2>
                {product.ProductMedia.length > 3 && (
                  <span className="text-sm text-muted-foreground">
                    A look inside their build
                  </span>
                )}
              </div>
              {hasBanner && (
                <ImageLightbox
                  src={product.bannerImage!}
                  alt={`${product.name} banner`}
                >
                  <div className="relative w-full overflow-hidden rounded-[28px] border border-[color:var(--brand-1)/0.18] bg-background/75">
                    <div className="relative aspect-[3/1] w-full">
                      <Image
                        src={product.bannerImage!}
                        alt={`${product.name} banner`}
                        fill
                        quality={95}
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 960px"
                        className="object-contain object-center"
                      />
                    </div>
                  </div>
                </ImageLightbox>
              )}
              {hasGallery && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {product.ProductMedia.map((m) => (
                    <ImageLightbox
                      key={m.id}
                      src={m.imageUrl}
                      alt={m.altText || product.name}
                    >
                      <div className="relative overflow-hidden rounded-[24px] border border-[color:var(--brand-1)/0.18] bg-background/70 pb-[56%]">
                        <Image
                          src={m.imageUrl}
                          alt={m.altText || product.name}
                          fill
                          quality={95}
                          className="object-contain object-center"
                        />
                      </div>
                    </ImageLightbox>
                  ))}
                </div>
              )}
            </section>
          )}

          {(hasDescription || hasKeywords || hasMetadataLinks) && (
            <section className="rounded-[28px] border border-[color:var(--brand-1)/0.15] bg-background/92 p-8 shadow-[0_30px_80px_-65px_rgba(7,58,104,0.55)] backdrop-blur">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Captain&apos;s log
                </h2>
                {hasDescription ? (
                  <div className="prose max-w-none prose-neutral dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: (props) => (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          />
                        ),
                        img: (props) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            {...props}
                            alt={(props as any).alt || ""}
                            className="rounded border"
                          />
                        ),
                      }}
                    >
                      {product.description}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    The crew will be adding their story soon. Check back for
                    their full log entry.
                  </p>
                )}
              </div>
            </section>
          )}

          {(hasMetadataLinks || hasKeywords) && (
            <section className="rounded-[24px] border border-[color:var(--brand-1)/0.15] bg-background/90 p-6 shadow-[0_25px_70px_-65px_rgba(7,58,104,0.5)] backdrop-blur">
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Harbor signals
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                  {hasMetadataLinks && (
                    <div className="space-y-3">
                      <div className="text-xs uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                        Signal flags
                      </div>
                      <div className="flex flex-col gap-2">
                        {secondaryLinks.map((link) => (
                          <Link
                            key={`${link.href}-detail`}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-between gap-2 rounded-xl border border-[color:var(--brand-1)/0.2] bg-background px-3 py-2 text-sm text-[color:var(--brand-1)] transition-colors hover:border-[color:var(--brand-1)/0.35]"
                          >
                            <span className="flex items-center gap-2">
                              {link.icon}
                              {link.label}
                            </span>
                            <ExternalLink size={14} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasKeywords && (
                    <div className="space-y-3">
                      <div className="text-xs uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                        Tags
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.keywords.map((k) => (
                          <Link
                            key={`${k}-harbor`}
                            href={{ pathname: BROWSE_PATH, query: { q: k } }}
                            className="inline-flex"
                          >
                            <Badge className="rounded-full border-[color:var(--brand-1)/0.3] bg-background/75 px-3 py-1 text-xs text-[color:var(--brand-1)]">
                              {k}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

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

          {hasCrew && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-foreground">
                  Crew manifest
                </h2>
                {product.organization?.name && (
                  <span className="text-sm text-muted-foreground">
                    {product.organization.name}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {crewMembers.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-[color:var(--brand-1)/0.18] bg-background/80 px-4 py-3 shadow-[0_18px_40px_-30px_rgba(7,58,104,0.55)]"
                  >
                    <div className="font-medium text-foreground">
                      {m.user.firstName} {m.user.lastName || ""}
                    </div>
                    {m.jobTitle && (
                      <div className="text-xs text-muted-foreground">
                        {m.jobTitle}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </PublicContainer>

      {hasUseCaseItems && primaryUseCaseSlug && (
        <PublicContainer
          as="section"
          max="marketing"
          paddingY="py-16"
          fillScreen={false}
          className="relative"
        >
          <div className="mx-auto max-w-6xl space-y-6 px-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                  Similar voyages
                </p>
                <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                  More ways to {primaryUseCaseLabel || "explore"}
                </h2>
              </div>
              <Link
                href={{
                  pathname: BROWSE_PATH,
                  query: { useCase: primaryUseCaseSlug },
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.2] px-4 py-2 text-sm font-semibold text-[color:var(--brand-1)] transition-colors hover:border-[color:var(--brand-1)/0.35]"
              >
                Explore use case <ExternalLink size={14} />
              </Link>
            </div>
            <ProductCompactGrid
              items={(useCaseItems as any[]).map((p) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                logo: p.logo,
                tagline: p.tagline,
                analytics: p.analytics ?? null,
                category: p.category ?? undefined,
              }))}
              columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              showCategory={false}
            />
          </div>
        </PublicContainer>
      )}
    </main>
  )
}

function VoyageMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--brand-1)/0.18] bg-[color:var(--brand-1)/0.05] px-4 py-3 text-left shadow-[0_18px_40px_-30px_rgba(7,58,104,0.55)]">
      <div className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
        {label}
      </div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  )
}
