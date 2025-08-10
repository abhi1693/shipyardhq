import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Metadata } from "next"
import { Badge } from "@/components/atoms/badge"
import { UpvoteSquare } from "@/components/molecules/UpvoteSquare"
import { Breadcrumbs } from "@/components/molecules/BreadCrumbs"
import { BADGE_OPTIONS } from "@/lib/constants"
import { badgeColorMap, TailwindColor } from "@/lib/utils"
import {
  getPublicProduct,
  getRelatedProductsByCategory,
} from "@/actions/public/products/actions"
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
  Firefox,
} from "lucide-react"
import PublicContainer from "@/components/layout/PublicContainer"
import ExternalBadgeLink from "@/components/molecules/ExternalBadgeLink"
import { formatCurrency } from "@/lib/ui/formatters"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ProductPageProps {
  params: { id: string }
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params
  const product = await getPublicProduct(id)
  if (!product) return {}
  return {
    title: `${product.name} | Product`,
    description: product.tagline || product.description,
    openGraph: {
      title: product.name,
      description: product.tagline || product.description,
      images: product.logo ? [{ url: product.logo }] : undefined,
    },
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params
  const product = await getPublicProduct(id)
  if (!product) return notFound()

  const isVerified = product.verification?.isVerified
  const stats = product.analytics
  const related = await getRelatedProductsByCategory(
    product.categoryId,
    product.id,
  )

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
        return <Firefox className="size-3" />
      default:
        return null
    }
  }

  return (
    <PublicContainer max="7xl" paddingY="py-12" innerClassName="space-y-8">
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
      <div className="flex items-start justify-between gap-6">
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
            By <Link href={`/users/${product.user.id}`} className="underline">{product.user.firstName} {product.user.lastName || ""}</Link>
          </div>

          <div className="mt-4 space-y-3">
            {/* Primary CTAs */}
            <div className="flex flex-wrap gap-2">
              <ExternalBadgeLink href={product.websiteUrl} target="_blank">
                <span className="flex items-center gap-1">
                  <ExternalLink size={14} /> Visit website
                </span>
              </ExternalBadgeLink>
              {product.ctaUrl && (
                <ExternalBadgeLink href={product.ctaUrl} target="_blank">
                  {product.ctaLabel || "Get Started"}
                </ExternalBadgeLink>
              )}
              {product.metadata?.demoUrl && (
                <ExternalBadgeLink
                  href={product.metadata.demoUrl}
                  target="_blank"
                  variant="outline"
                >
                  Live demo
                </ExternalBadgeLink>
              )}
            </div>

            {/* Platforms left, secondary links right */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {product.platforms && product.platforms.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap md:flex-nowrap md:overflow-x-auto md:whitespace-nowrap">
                  <span className="text-sm text-muted-foreground">Platforms:</span>
                  {product.platforms.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">
                      <span className="flex items-center gap-1">
                        {platformIcon(p)} {p.replaceAll("_", " ")}
                      </span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <div />
              )}
              {(product.metadata?.githubUrl ||
                product.metadata?.twitterUrl ||
                product.metadata?.contactEmail) && (
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {product.metadata?.githubUrl && (
                    <ExternalBadgeLink
                      href={product.metadata.githubUrl}
                      target="_blank"
                      variant="outline"
                    >
                      <span className="flex items-center gap-1 text-sm">
                        <Github size={14} /> GitHub
                      </span>
                    </ExternalBadgeLink>
                  )}
                  {product.metadata?.twitterUrl && (
                    <ExternalBadgeLink
                      href={product.metadata.twitterUrl}
                      target="_blank"
                      variant="outline"
                    >
                      <span className="flex items-center gap-1 text-sm">
                        <Twitter size={14} /> Twitter
                      </span>
                    </ExternalBadgeLink>
                  )}
                  {product.metadata?.contactEmail && (
                    <ExternalBadgeLink
                      href={`mailto:${product.metadata.contactEmail}`}
                      variant="outline"
                    >
                      <span className="flex items-center gap-1 text-sm">
                        <Mail size={14} /> Contact
                      </span>
                    </ExternalBadgeLink>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: upvotes/views + pricing */}
        <div className="shrink-0">
          <div className="flex flex-col items-end gap-3">
            <UpvoteSquare count={stats?.upvotes || 0} title="Total upvotes" />
            <div className="text-sm text-muted-foreground">
              {stats?.views || 0} views • {stats?.clicks || 0} clicks
            </div>
            {((product.startingPriceCents !== null &&
              product.startingPriceCents !== undefined) || product.pricingModel) && (
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
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
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
              <Badge key={`${uc.useCaseId}-${uc.categoryId}`} variant="secondary" className="text-xs">
                <CheckCircle size={12} className="mr-1" /> {uc.useCase.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Plan Features removed */}

      {/* Team (Organization Members) */}
      {product.organization && product.organization.memberships && product.organization.memberships.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {product.organization.memberships.map((m) => (
              <div key={m.id} className="rounded-md border p-3 bg-muted/30">
                <div className="font-medium">
                  {m.user.firstName} {m.user.lastName || ""}
                </div>
                {m.jobTitle && (
                  <div className="text-sm text-muted-foreground">{m.jobTitle}</div>
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
            <div className="relative w-full aspect-[3/1] overflow-hidden rounded-lg border bg-muted">
              <Image
                src={product.bannerImage}
                alt={`${product.name} banner`}
                fill
                className="object-cover"
              />
            </div>
          )}
          {product.ProductMedia.length > 0 && (
            <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${product.bannerImage ? 'mt-3' : ''}`}>
              {product.ProductMedia.map((m) => (
                <div
                  key={m.id}
                  className="relative aspect-video overflow-hidden rounded-md border bg-muted"
                >
                  <Image
                    src={m.imageUrl}
                    alt={m.altText || product.name}
                    fill
                    className="object-cover"
                  />
                </div>
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
            a: ({ node, ...props }) => (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              />
            ),
            img: ({ node, ...props }) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img {...props} alt={(props as any).alt || ""} className="rounded border" />
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
            <Badge key={k} variant="secondary" className="text-xs">
              {k}
            </Badge>
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
                href={`/products/${r.id}`}
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
