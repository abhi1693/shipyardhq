import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Metadata } from "next"
import { Badge } from "@/components/atoms/badge"
import UpvoteSquareButton from "@/components/molecules/UpvoteSquareButton"
import { upvoteProductAction } from "@/actions/public/products/upvote"
import { hasUserUpvoted } from "@/actions/public/products/actions"
import { auth } from "@clerk/nextjs/server"
import { Breadcrumbs } from "@/components/molecules/BreadCrumbs"
import { BADGE_OPTIONS } from "@/lib/constants"
import { badgeColorMap, TailwindColor } from "@/lib/utils"
import {
  getPublicProductBySlug,
  getRelatedProductsByCategory,
} from "@/actions/public/products/actions"
import { getPublicProductMetaBySlug } from "@/actions/public/products/actions"
import {
  CheckCircle,
  ExternalLink,
  Github,
  Twitter,
  Mail,
  Tag,
  Globe,
  Apple,
  Smartphone,
  Monitor,
  Laptop,
  Terminal,
  Chrome,
} from "lucide-react"
import PublicContainer from "@/components/layout/PublicContainer"
import ExternalBadgeLink from "@/components/molecules/ExternalBadgeLink"
import { formatCurrency } from "@/lib/ui/formatters"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { IconBrandFirefox } from "@tabler/icons-react"
import { addUtmParams } from "@/lib/marketing/utm"
import { hasPlanFeature } from "@/lib/features"
import { JSX } from "react"
import ImageLightbox from "@/components/molecules/ImageLightbox"
import ProductMetricsTracker from "@/components/pages/ProductMetricsTracker"

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getPublicProductMetaBySlug(slug)
  if (!product) return {}
  const relativeUrl = `/products/${product.slug}`
  const desc = product.tagline || product.description || undefined
  const images = [product.bannerImage, product.logo].filter(Boolean) as string[]
  const authorName =
    [product.user?.firstName || "", product.user?.lastName || ""]
      .join(" ")
      .trim() || undefined

  return {
    title: `${product.name} | Product`,
    description: desc,
    keywords:
      product.keywords && product.keywords.length
        ? product.keywords
        : undefined,
    alternates: { canonical: relativeUrl },
    openGraph: {
      title: product.name,
      description: desc,
      url: relativeUrl,
      type: "website",
      images: images.length ? images.map((url) => ({ url })) : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: desc,
      images: images.length ? images : undefined,
    },
    robots:
      product.status === "published"
        ? { index: true, follow: true }
        : { index: false, follow: false },
    authors: authorName ? [{ name: authorName }] : undefined,
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getPublicProductBySlug(slug)
  if (!product) return notFound()

  const isVerified = product.verification?.isVerified
  const stats = product.analytics
  const [authResult, related] = await Promise.all([
    auth(),
    getRelatedProductsByCategory(product.categoryId, product.id),
  ])

  const userId = authResult.userId
  const userUpvoted = userId ? await hasUserUpvoted(product.id, userId) : false

  const activeBadgeDefs = (product.badges || [])
    .map((b) => BADGE_OPTIONS.find((x) => x.value === b))
    .filter(Boolean) as typeof BADGE_OPTIONS

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

  return (
    <PublicContainer max="7xl" paddingY="py-12" innerClassName="space-y-8">
      <ProductMetricsTracker productId={product.id} />
      <Breadcrumbs
        items={[
          { title: "Categories", link: "/categories" },
          {
            title: product.category.name,
            link: `/categories/${product.category.slug}`,
          },
          { title: "Products", link: "/browse" },
          { title: product.name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        {/* Left column wrapper */}
        <div className="flex-1 min-w-0">
          {/* Top row: icon + name/tagline */}
          <div className="flex items-start gap-6">
            <div className="h-16 w-16 rounded-md overflow-hidden border bg-white shrink-0">
              <Image
                src={product.logo}
                alt={product.name}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold truncate">{product.name}</h1>
              <p className="text-muted-foreground mt-1">{product.tagline}</p>
            </div>
          </div>

          {/* Below icon: badges, author, CTAs, platforms (all left-aligned) */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Link href={`/categories/${product.category.slug}`}>
              <Badge variant="secondary">{product.category.name}</Badge>
            </Link>
            <Badge variant="outline" className="text-xs">
              {product.type.replaceAll("_", " ")}
            </Badge>
            {isVerified && (
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1 px-2 py-0.5 text-xs">
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

          <div className="text-sm text-muted-foreground mt-2">
            By{" "}
            <Link href={`/users/${product.user.id}`} className="underline">
              {product.user.firstName} {product.user.lastName || ""}
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {/* Primary CTAs */}
            <div className="flex flex-wrap gap-2">
              <ExternalBadgeLink
                href={
                  hasBacklinkFeature
                    ? withUtm(product.websiteUrl, "visit-website")
                    : product.websiteUrl
                }
                productId={hasBacklinkFeature ? undefined : product.id}
                follow={hasBacklinkFeature}
                target={hasBacklinkFeature ? "_blank" : undefined}
                rel={hasBacklinkFeature ? "noopener" : undefined}
              >
                <span className="flex items-center gap-1">
                  <ExternalLink size={14} /> Visit website
                </span>
              </ExternalBadgeLink>
              {product.ctaUrl && hasCustomCtaFeature && (
                <ExternalBadgeLink
                  href={
                    hasBacklinkFeature
                      ? withUtm(product.ctaUrl, "cta")
                      : product.ctaUrl
                  }
                  productId={hasBacklinkFeature ? undefined : product.id}
                  follow={hasBacklinkFeature}
                  target={hasBacklinkFeature ? "_blank" : undefined}
                  rel={hasBacklinkFeature ? "noopener" : undefined}
                >
                  {product.ctaLabel || "Get Started"}
                </ExternalBadgeLink>
              )}
              {product.metadata?.demoUrl && (
                <ExternalBadgeLink
                  href={
                    hasBacklinkFeature
                      ? withUtm(product.metadata.demoUrl, "demo")
                      : product.metadata.demoUrl
                  }
                  variant="outline"
                  productId={hasBacklinkFeature ? undefined : product.id}
                  follow={hasBacklinkFeature}
                  target={hasBacklinkFeature ? "_blank" : undefined}
                  rel={hasBacklinkFeature ? "noopener" : undefined}
                >
                  Live demo
                </ExternalBadgeLink>
              )}
            </div>

            {/* Platforms + secondary links inline (no large gap) */}
            <div className="flex flex-wrap items-center gap-2">
              {product.platforms && product.platforms.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    Platforms:
                  </span>
                  {product.platforms.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">
                      <span className="flex items-center gap-1">
                        {platformIcon(p)} {p.replaceAll("_", " ")}
                      </span>
                    </Badge>
                  ))}
                </>
              )}
              {(() => {
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
                ].filter(Boolean) as {
                  href: string
                  label: string
                  icon: JSX.Element
                }[]
                return secondaryLinks.length ? (
                  <>
                    <span className="mx-1 hidden md:inline text-muted-foreground/50">
                      •
                    </span>
                    {secondaryLinks.map((l) => (
                      <ExternalBadgeLink
                        key={l.href}
                        href={l.href}
                        variant="outline"
                        productId={hasBacklinkFeature ? undefined : product.id}
                        follow={hasBacklinkFeature}
                        target={hasBacklinkFeature ? "_blank" : undefined}
                        rel={hasBacklinkFeature ? "noopener" : undefined}
                      >
                        <span className="flex items-center gap-1 text-sm">
                          {l.icon} {l.label}
                        </span>
                      </ExternalBadgeLink>
                    ))}
                  </>
                ) : null
              })()}
            </div>
          </div>
        </div>

        {/* Right column: upvotes + pricing */}
        <div className="shrink-0 md:self-start self-end md:mt-0 mt-4">
          <div className="flex flex-col items-end gap-3">
            <UpvoteSquareButton
              productId={product.id}
              initialCount={stats?.upvotes || 0}
              initialUpvoted={userUpvoted}
              title="Total upvotes"
              action={upvoteProductAction}
            />
            <div className="text-sm text-muted-foreground">
              {stats?.clicks || 0} clicks
            </div>
            {((product.startingPriceCents !== null &&
              product.startingPriceCents !== undefined) ||
              product.pricingModel) && (
              <div className="text-right mt-1">
                {product.startingPriceCents !== null &&
                  product.startingPriceCents !== undefined && (
                    <div className="text-2xl font-extrabold">
                      <span className="text-sm font-normal text-muted-foreground align-baseline mr-1">
                        Starting at
                      </span>
                      {formatCurrency(
                        product.startingPriceCents,
                        product.currencyCode || "USD",
                      )}
                    </div>
                  )}
                <div className="mt-1">
                  <Badge
                    variant="secondary"
                    className="text-xs flex items-center gap-1"
                  >
                    <Tag size={12} /> {product.pricingModel}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Use Cases (from Category) */}
      {product.category.useCases && product.category.useCases.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Use cases</h2>
          <div className="flex flex-wrap gap-2">
            {product.category.useCases.map((uc) => (
              <Badge
                key={`${uc.useCaseId}-${uc.categoryId}`}
                variant="secondary"
                className="text-xs"
                asChild
              >
                <Link
                  href={{
                    pathname: "/browse",
                    query: { useCase: uc.useCase.slug },
                  }}
                >
                  <CheckCircle size={12} className="mr-1" /> {uc.useCase.label}
                </Link>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Plan Features removed */}

      {/* Team (Organization Members) */}
      {product.organization &&
        product.organization.memberships &&
        product.organization.memberships.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Team</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {product.organization.memberships.map((m) => (
                <div key={m.id} className="rounded-md border p-3 bg-muted/30">
                  <div className="font-medium">
                    {m.user.firstName} {m.user.lastName || ""}
                  </div>
                  {m.jobTitle && (
                    <div className="text-sm text-muted-foreground">
                      {m.jobTitle}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Media (Banner + Gallery) */}
      {(product.bannerImage || product.ProductMedia.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Media</h2>
          {product.bannerImage && (
            <ImageLightbox
              src={product.bannerImage}
              alt={`${product.name} banner`}
            >
              <div className="relative w-full aspect-[3/1] overflow-hidden rounded-lg border bg-muted cursor-zoom-in">
                <Image
                  src={product.bannerImage}
                  alt={`${product.name} banner`}
                  fill
                  quality={95}
                  priority
                  className="object-contain"
                />
              </div>
            </ImageLightbox>
          )}
          {product.ProductMedia.length > 0 && (
            <div
              className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${product.bannerImage ? "mt-3" : ""}`}
            >
              {product.ProductMedia.map((m) => (
                <ImageLightbox
                  key={m.id}
                  src={m.imageUrl}
                  alt={m.altText || product.name}
                >
                  <div className="relative aspect-video overflow-hidden rounded-md border bg-muted cursor-zoom-in">
                    <Image
                      src={m.imageUrl}
                      alt={m.altText || product.name}
                      fill
                      quality={95}
                      className="object-cover"
                    />
                  </div>
                </ImageLightbox>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Description (Markdown) */}
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
          {product.description || ""}
        </ReactMarkdown>
      </div>

      {/* Tags */}
      {product.keywords && product.keywords.length > 0 && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Tags:</span>
          {product.keywords.map((k) => (
            <Link
              key={k}
              href={{ pathname: "/browse", query: { q: k } }}
              className="inline-flex"
            >
              <Badge variant="secondary" className="text-xs hover:bg-accent">
                {k}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div className="pt-2">
          <h2 className="text-lg font-semibold mb-3">
            More in {product.category.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/products/${r.slug}`}
                className="group border rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-md overflow-hidden border bg-white">
                    <Image
                      src={r.logo}
                      alt={r.name}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium group-hover:underline truncate">
                      {r.name}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {r.tagline}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PublicContainer>
  )
}
