import { notFound } from "next/navigation"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { OverviewRow } from "@/components/layout/object-view/overview"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import {
  formatBoolean,
  formatDate,
  image,
  linkify,
  placeholder,
  commaSeparated,
  formatCurrency,
  slug as slugFmt,
} from "@/lib/ui/formatters"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { VerifyDomainButton } from "@/components/molecules/VerifyDomainButton"
import { getProductById } from "@/actions/admin/products/actions"
import { auth } from "@clerk/nextjs/server"
import ProductMediaManager from "@/components/molecules/ProductMediaManager"
import prisma from "@/lib/prisma"
import ProductStatusActions from "@/components/molecules/ProductStatusActions"
import CopyButton from "@/components/molecules/CopyButton"
import DuplicateProductButton from "@/components/molecules/DuplicateProductButton"
import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Avatar, AvatarFallback } from "@/components/atoms/avatar"
import {
  getProductActivity,
  getRecentUpvoters,
} from "@/actions/member/products/actions"
// ShareOnX badge is still available elsewhere; header uses ShareOnXButton
import ShareOnXButton from "@/components/molecules/ShareOnXButton"
import { ExternalLink, Copy as CopyIcon } from "lucide-react"
import PerformanceCard from "@/components/molecules/PerformanceCard"

export default async function ViewUserProductPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = await params
  const found = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  })
  const product = found ? await getProductById(found.id) : null
  if (!product) return notFound()
  const { userId: clerkId } = await auth()
  const isOwner = Boolean(clerkId && product.user?.clerkId === clerkId)
  const publicPath = `/products/${product.slug}`
  const activity = await getProductActivity(product.id, 30, 12).catch(() => [])
  const upvoters = await getRecentUpvoters(product.id, 5).catch(() => [])

  return (
    <ObjectPageLayout
      heading={{
        id: product.slug,
        title: product.name,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        slug: product.id,
      }}
      overview={[
        { label: "Name", value: product.name },
        { label: "Category", value: product.category.name },
        {
          label: "Status",
          value: (
            <ProductStatusActions
              productId={product.id}
              slug={product.slug}
              status={product.status as any}
            />
          ),
        },
        { label: "Type", value: product.type.replace("_", " ") },
        {
          label: "Pricing",
          value: (
            <span>
              {product.pricingModel.replace("_", " ")}
              {product.startingPriceCents != null && product.currencyCode ? (
                <>
                  {" "}
                  —{" "}
                  {formatCurrency(
                    product.startingPriceCents,
                    product.currencyCode,
                  )}
                </>
              ) : null}
            </span>
          ),
        },
        ...(product.verification
          ? [
              {
                label: "Verified",
                value: formatBoolean(product.verification.isVerified),
              },
              {
                label: "Verified At",
                value: product.verification.verifiedAt
                  ? formatDate(product.verification.verifiedAt)
                  : placeholder(),
              },
              {
                label: "Domain",
                value: (() => {
                  try {
                    return new URL(product.websiteUrl).hostname
                  } catch {
                    return product.websiteUrl
                  }
                })(),
              },
              !product.verification.isVerified
                ? {
                    label: "Verify Domain",
                    value: (
                      <div className="flex items-center gap-2">
                        <CopyButton
                          text={product.verification!.verificationTxt}
                          label="Copy TXT"
                        />
                        <VerifyDomainButton productId={product.id} />
                      </div>
                    ),
                  }
                : null,
            ].filter(Boolean) as any
          : []),
      ]}
      basePath="member/products"
      deletable
      editable
      headingActionsLeft={
        <div className="flex items-center gap-2">
          <Link href={publicPath} target="_blank">
            <Button size="sm">
              <ExternalLink className="h-4 w-4 mr-2" /> View public
            </Button>
          </Link>
          <CopyButton
            text={publicPath}
            resolveAbsolute
            size="sm"
            variant="outline"
          >
            <>
              <CopyIcon className="h-4 w-4 mr-2" /> Copy link
            </>
          </CopyButton>
          <ShareOnXButton path={publicPath} productName={product.name} />
          <DuplicateProductButton productId={product.id} />
        </div>
      }
      topRowExtras={[
        // Branding moved next to Overview
        <Card key="branding">
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
          </CardHeader>
          <CardContent>
            <OverviewRow label="Slug" value={slugFmt(product.slug)} />
            <OverviewRow label="Tagline" value={product.tagline} />
            <OverviewRow
              label="Logo"
              value={image(product.logo, product.name, 64, 64)}
            />
            {product.bannerImage && (
              <OverviewRow
                label="Banner"
                value={image(
                  product.bannerImage,
                  `${product.name} banner`,
                  480,
                  160,
                )}
              />
            )}
          </CardContent>
        </Card>,
        // Plan follows after Branding
        <Card key="plan">
          <CardHeader>
            <CardTitle className="text-base">Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {product.plan ? (
              <>
                <div className="text-sm">
                  <span className="text-muted-foreground">Name:</span>{" "}
                  {product.plan.name}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Price:</span>{" "}
                  {formatCurrency(product.plan.price)}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Interval:</span>{" "}
                  {product.plan.frequency} {product.plan.interval}
                </div>
                {product.plan.trialDays && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Trial:</span>{" "}
                    {product.plan.trialDays} days
                  </div>
                )}
                <Link href={`/member/products/${product.slug}/edit`}>
                  <Button className="w-full">Manage plan</Button>
                </Link>
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  No plan selected.
                </div>
                <Link href={`/member/products/${product.slug}/edit`}>
                  <Button className="w-full">Choose a plan</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>,
      ]}
      relationships={
        <div className="grid grid-cols-12 gap-6">
          {/* Primary setup: Links + Performance */}
          <Card className="col-span-12 md:col-span-8">
            <CardHeader>
              <CardTitle className="text-base">Links</CardTitle>
            </CardHeader>
            <CardContent>
              <OverviewRow
                label="Website"
                value={linkify({
                  href: product.websiteUrl,
                  label: product.websiteUrl,
                  isExternal: true,
                })}
              />
              <OverviewRow
                label="CTA Label"
                value={product.ctaLabel || placeholder()}
              />
              <OverviewRow
                label="CTA URL"
                value={
                  product.ctaUrl
                    ? linkify({
                        href: product.ctaUrl,
                        label: product.ctaUrl,
                        isExternal: true,
                      })
                    : placeholder()
                }
              />
              {((product.ctaLabel && !product.ctaUrl) ||
                (!product.ctaLabel && product.ctaUrl)) && (
                <div className="mt-2 text-xs text-destructive">
                  Tip: Provide both CTA label and URL for a complete
                  call-to-action.
                </div>
              )}
              <OverviewRow
                label="Organization URL"
                value={
                  product.organization?.url
                    ? linkify({
                        href: product.organization.url,
                        label: product.organization.url,
                        isExternal: true,
                      })
                    : placeholder()
                }
              />
              {product.metadata?.githubUrl && (
                <OverviewRow
                  label="GitHub"
                  value={linkify({
                    href: product.metadata.githubUrl,
                    label: product.metadata.githubUrl,
                    isExternal: true,
                  })}
                />
              )}
              {product.metadata?.twitterUrl && (
                <OverviewRow
                  label="Twitter"
                  value={linkify({
                    href: product.metadata.twitterUrl,
                    label: product.metadata.twitterUrl,
                    isExternal: true,
                  })}
                />
              )}
              {product.metadata?.demoUrl && (
                <OverviewRow
                  label="Demo"
                  value={linkify({
                    href: product.metadata.demoUrl,
                    label: product.metadata.demoUrl,
                    isExternal: true,
                  })}
                />
              )}
              {product.metadata?.contactEmail && (
                <OverviewRow
                  label="Contact Email"
                  value={product.metadata.contactEmail}
                />
              )}
            </CardContent>
          </Card>
          {/* Verification moved to top row */}

          <PerformanceCard
            upvotes={product.analytics?.upvotes ?? 0}
            clicks={product.analytics?.clicks ?? 0}
            upvoters={upvoters as any}
            badges={(product.ProductBadge || []) as any}
            productName={product.name}
            tagline={product.tagline}
            hasBanner={Boolean(product.bannerImage)}
            editHref={`/member/products/${product.slug}/edit`}
          />

          {/* Media */}
          <Card className="col-span-12">
            <CardHeader>
              <CardTitle className="text-base">Media Gallery</CardTitle>
            </CardHeader>
            <CardContent>
              {(product.ProductMedia || []).length < 2 && (
                <div className="mb-3 text-xs text-muted-foreground">
                  Tip: Add at least 2 screenshots (suggested 1280×720). Banner
                  works best at 1200×628.
                </div>
              )}
              <ProductMediaManager
                productId={product.id}
                media={(product.ProductMedia || []).map((m) => ({
                  id: m.id,
                  imageUrl: m.imageUrl,
                }))}
                canEdit={isOwner}
              />
            </CardContent>
          </Card>
          {/* Organization & Targeting moved to top row */}

          {/* Links and Verification moved above */}

          {/* Description */}
          <Card className="col-span-12">
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                {(() => {
                  const len = (product.description || "").trim().length
                  const good = len >= 200
                  return (
                    <div className="text-xs">
                      Quality:{" "}
                      {good ? (
                        <span className="text-green-600">Good</span>
                      ) : (
                        <span className="text-yellow-600">Needs work</span>
                      )}{" "}
                      ({len} chars)
                    </div>
                  )
                })()}
                <Link
                  href={`/member/products/${product.slug}/edit`}
                  className="text-xs text-primary hover:underline"
                >
                  Improve description
                </Link>
              </div>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {product.description}
                </ReactMarkdown>
              </div>
              <OverviewRow
                label="Published At"
                value={
                  product.publishedAt
                    ? formatDate(product.publishedAt)
                    : placeholder()
                }
              />
            </CardContent>
          </Card>

          {/* Plan details removed for simplicity; managed via Plan card CTA */}

          {/* Analytics moved above */}
        </div>
      }
    />
  )
}
