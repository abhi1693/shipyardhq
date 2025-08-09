import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Metadata } from "next"
import { Badge } from "@/components/atoms/badge"
import { UpvoteSquare } from "@/components/molecules/UpvoteSquare"
import { Breadcrumbs } from "@/components/molecules/BreadCrumbs"
import { BADGE_OPTIONS } from "@/lib/constants"
import { badgeColorMap, TailwindColor } from "@/lib/utils"
import { formatDate } from "@/lib/ui/formatters"
import {
  getPublicProduct,
  getRelatedProductsByCategory,
} from "@/actions/public/products/actions"
import { CheckCircle, ExternalLink, Github, Twitter, Mail, Tag } from "lucide-react"
import PublicContainer from "@/components/layout/PublicContainer"
import ExternalBadgeLink from "@/components/molecules/ExternalBadgeLink"
import { formatCurrency } from "@/lib/ui/formatters"

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

  return (
    <PublicContainer max="7xl" paddingY="py-12" innerClassName="space-y-8">
        {/* Optional Banner */}
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

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold truncate">{product.name}</h1>
            <p className="text-muted-foreground mt-1">{product.tagline}</p>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Link href={`/categories/${product.category.slug}`}>
                <Badge variant="secondary">{product.category.name}</Badge>
              </Link>
              <Badge variant="outline" className="text-xs">
                {product.type.replaceAll("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Tag size={12} className="mr-1" /> {product.pricingModel}
              </Badge>
              {isVerified && (
                <Badge className="bg-green-100 text-green-800 flex items-center gap-1 px-2 py-0.5 text-xs">
                  <CheckCircle size={12} /> Verified domain
                </Badge>
              )}
              {product.plan && (
                <Badge variant="outline" className="text-xs">
                  Plan: {product.plan.name}
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
          </div>
        </div>

        {/* Meta + CTAs */}
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap text-sm text-muted-foreground">
            <span>
              By {product.user.firstName} {product.user.lastName || ""} (
              {product.user.email})
            </span>
            <span>Created: {formatDate(product.createdAt)}</span>
            <span>Updated: {formatDate(product.updatedAt)}</span>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <ExternalBadgeLink href={product.websiteUrl} target="_blank">
              <span className="flex items-center gap-1">
                <ExternalLink size={14} /> Website
              </span>
            </ExternalBadgeLink>
            {product.ctaUrl && (
              <ExternalBadgeLink href={product.ctaUrl} target="_blank">
                {product.ctaLabel || "Get Started"}
              </ExternalBadgeLink>
            )}
            {product.metadata?.demoUrl && (
              <ExternalBadgeLink href={product.metadata.demoUrl} target="_blank" variant="outline">
                Live Demo
              </ExternalBadgeLink>
            )}
            {product.metadata?.githubUrl && (
              <ExternalBadgeLink href={product.metadata.githubUrl} target="_blank" variant="outline">
                <span className="flex items-center gap-1">
                  <Github size={14} /> GitHub
                </span>
              </ExternalBadgeLink>
            )}
            {product.metadata?.twitterUrl && (
              <ExternalBadgeLink href={product.metadata.twitterUrl} target="_blank" variant="outline">
                <span className="flex items-center gap-1">
                  <Twitter size={14} /> Twitter
                </span>
              </ExternalBadgeLink>
            )}
            {product.metadata?.contactEmail && (
              <ExternalBadgeLink href={`mailto:${product.metadata.contactEmail}`} variant="outline">
                <span className="flex items-center gap-1">
                  <Mail size={14} /> Contact
                </span>
              </ExternalBadgeLink>
            )}
          </div>

          <div className="flex gap-6 items-center text-sm pt-1">
            <UpvoteSquare count={stats?.upvotes || 0} title="Total upvotes" />
            <div className="text-muted-foreground">
              {stats?.views || 0} views • {stats?.clicks || 0} clicks
            </div>
          </div>
        </div>

        {/* Quick Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {(product.startingPriceCents !== null && product.startingPriceCents !== undefined) && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Starting at:</span>
              {formatCurrency(product.startingPriceCents, product.currencyCode || 'USD')}
            </div>
          )}
          {(product.platforms && product.platforms.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Platforms:</span>
              {product.platforms.map((p) => (
                <Badge key={p} variant="outline" className="text-xs">
                  {p.replaceAll('_', ' ')}
                </Badge>
              ))}
            </div>
          )}
          {(product.companyName || product.organization) && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Company:</span>
              <span>
                {product.companyName || product.organization?.name}
              </span>
            </div>
          )}
          {(product.keywords && product.keywords.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Tags:</span>
              {product.keywords.map((k) => (
                <Badge key={k} variant="secondary" className="text-xs">
                  {k}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="text-sm md:text-base leading-relaxed text-foreground/90 whitespace-pre-line">
          {product.description}
        </div>

        {/* Media Gallery */}
        {product.ProductMedia.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
