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
import { Avatar, AvatarFallback } from "@/components/atoms/avatar"
import { getProductActivity, getRecentUpvoters } from "@/actions/member/products/actions"
import ShareOnX from "@/components/molecules/ShareOnX"

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
        { label: "Status", value: (
          <ProductStatusActions
            productId={product.id}
            slug={product.slug}
            status={product.status as any}
          />
        ) },
        { label: "Type", value: product.type.replace("_", " ") },
      ]}
      basePath="member/products"
      deletable
      editable
      relationships={
        <div className="grid grid-cols-12 gap-6">
          {/* Actions */}
          <Card className="col-span-12">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-2">
                <Link href={publicPath} target="_blank">
                  <Badge variant="secondary" className="cursor-pointer">View public page</Badge>
                </Link>
                <CopyButton text={publicPath} label="Copy link" resolveAbsolute />
                <ShareOnX path={publicPath} productName={product.name} />
              </div>
              <DuplicateProductButton productId={product.id} />
            </CardContent>
          </Card>
          {/* Branding */}
          <Card className="col-span-12 md:col-span-4">
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
          </Card>

          {/* Organization & Targeting */}
          <Card className="col-span-12 md:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">
                Organization & Targeting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OverviewRow
                label="Organization"
                value={product.organization?.name || placeholder()}
              />
              <OverviewRow
                label="Platforms"
                value={
                  product.platforms?.length
                    ? commaSeparated(
                        product.platforms.map((p) => p.replace("_", " ")),
                      )
                    : placeholder()
                }
              />
              <OverviewRow
                label="Keywords"
                value={
                  product.keywords?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {product.keywords.map((k) => (
                        <Link key={k} href={`/member/products?q=${encodeURIComponent(k)}`}>
                          <Badge variant="secondary" className="text-xs">{k}</Badge>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    placeholder()
                  )
                }
              />
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="col-span-12 md:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <OverviewRow
                label="Model"
                value={product.pricingModel.replace("_", " ")}
              />
              <OverviewRow
                label="Starting Price"
                value={
                  product.startingPriceCents != null && product.currencyCode
                    ? formatCurrency(
                        product.startingPriceCents,
                        product.currencyCode,
                      )
                    : placeholder()
                }
              />
            </CardContent>
          </Card>

          {/* Links */}
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
              {((product.ctaLabel && !product.ctaUrl) || (!product.ctaLabel && product.ctaUrl)) && (
                <div className="mt-2 text-xs text-destructive">
                  Tip: Provide both CTA label and URL for a complete call-to-action.
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

          {/* Verification */}
          {product.verification && (
            <Card className="col-span-12 md:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <OverviewRow
                  label="Verification TXT"
                  value={
                    <div className="flex items-center gap-2">
                      <span className="break-all text-sm">
                        {product.verification.verificationTxt}
                      </span>
                      <CopyButton text={product.verification.verificationTxt} label="Copy TXT" />
                    </div>
                  }
                />
                <OverviewRow
                  label="Verified"
                  value={formatBoolean(product.verification.isVerified)}
                />
                <OverviewRow
                  label="Verified At"
                  value={
                    product.verification.verifiedAt
                      ? formatDate(product.verification.verifiedAt)
                      : placeholder()
                  }
                />
                <div className="text-xs text-muted-foreground mt-2">
                  Domain: {(() => { try { return new URL(product.websiteUrl).hostname } catch { return product.websiteUrl } })()}
                </div>
                {!product.verification.isVerified && (
                  <OverviewRow
                    label="Verify Domain"
                    value={<VerifyDomainButton productId={product.id} />}
                  />
                )}
              </CardContent>
            </Card>
          )}

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
                      Quality: {good ? <span className="text-green-600">Good</span> : <span className="text-yellow-600">Needs work</span>} ({len} chars)
                    </div>
                  )
                })()}
                <Link href={`/member/products/${product.slug}/edit`} className="text-xs text-primary hover:underline">Improve description</Link>
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

          {/* SEO Preview */}
          <Card className="col-span-12">
            <CardHeader>
              <CardTitle className="text-base">SEO Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded border p-4 bg-muted/30">
                <div className="text-lg font-semibold truncate">{product.name}</div>
                <div className="text-sm text-muted-foreground truncate">{product.tagline}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Open Graph image: {product.bannerImage ? 'Banner' : 'Logo'}
                </div>
                {!product.bannerImage && (
                  <div className="text-xs text-yellow-700 mt-1">
                    Tip: Add a banner image (recommended 1200×628) for rich link previews.
                  </div>
                )}
                {(!product.keywords || product.keywords.length === 0) && (
                  <div className="text-xs text-yellow-700 mt-1">
                    Tip: Add keywords to help discovery.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plan & Features */}
          <Card className="col-span-12">
            <CardHeader>
              <CardTitle className="text-base">Plan & Features</CardTitle>
            </CardHeader>
            <CardContent>
              {product.plan ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <OverviewRow label="Plan" value={product.plan.name} />
                    <OverviewRow
                      label="Type"
                      value={product.plan.type.replace("_", " ")}
                    />
                    <OverviewRow
                      label="Price"
                      value={formatCurrency(product.plan.price)}
                    />
                    <OverviewRow
                      label="Interval"
                      value={`${product.plan.frequency} ${product.plan.interval}`}
                    />
                    <OverviewRow
                      label="Trial Days"
                      value={product.plan.trialDays ?? placeholder()}
                    />
                  </div>
                  {product.plan.assignments?.length ? (
                    <div className="pt-3">
                      <div className="text-muted-foreground mb-2">Features</div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {product.plan.assignments.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center justify-between rounded border px-3 py-2"
                          >
                            <div>
                              <div className="font-medium">
                                {a.feature.name}
                              </div>
                              <div className="text-xs text-muted-foreground break-all">
                                {a.feature.description}
                              </div>
                            </div>
                            {a.enabled ? (
                              <span className="text-green-600 text-xs">
                                Enabled
                              </span>
                            ) : (
                              <span className="text-destructive text-xs">
                                Disabled
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No plan assigned
                </div>
              )}
            </CardContent>
          </Card>

          {/* Media Gallery */}
          <Card className="col-span-12">
            <CardHeader>
              <CardTitle className="text-base">Media Gallery</CardTitle>
            </CardHeader>
            <CardContent>
              {(product.ProductMedia || []).length < 2 && (
                <div className="mb-3 text-xs text-muted-foreground">
                  Tip: Add at least 2 screenshots (suggested 1280×720). Banner works best at 1200×628.
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

          {/* Badges */}
          <Card className="col-span-12 md:col-span-6">
            <CardHeader>
              <CardTitle className="text-base">Badges</CardTitle>
            </CardHeader>
            <CardContent>
              {product.ProductBadge?.length ? (
                <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.ProductBadge.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between rounded border px-3 py-2"
                    >
                      <span className="font-medium break-all">{b.badge}</span>
                      <span className={`text-xs ${b.expiresAt && (new Date(b.expiresAt).getTime() - Date.now())/(1000*60*60*24) < 7 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        {b.expiresAt
                          ? (() => { const d = Math.max(0, Math.ceil((new Date(b.expiresAt).getTime() - Date.now())/(1000*60*60*24))); return `${d}d left` })()
                          : "No expiry"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">No badges</div>
              )}
            </CardContent>
          </Card>

          {/* Analytics */}
          {product.analytics && (
            <Card className="col-span-12">
              <CardHeader>
                <CardTitle className="text-base">Analytics</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 text-center gap-4">
                <div>
                  <div className="text-xl font-bold">
                    {product.analytics.upvotes}
                  </div>
                  <div className="text-sm text-muted-foreground">Upvotes</div>
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {product.analytics.clicks}
                  </div>
                  <div className="text-sm text-muted-foreground">Clicks</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity */}
          <Card className="col-span-12 md:col-span-6">
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(activity) && activity.length ? (
                <ul className="space-y-2 text-sm">
                  {activity.map((a: any, i: number) => (
                    <li key={i} className="flex items-center justify-between">
                      <span className="truncate">
                        {a.type === 'product_created' && 'Created'}
                        {a.type === 'product_updated' && 'Updated'}
                        {a.type === 'domain_verified' && 'Domain verified'}
                        {a.type === 'badge_assigned' && `Badge “${a.meta?.badge}” assigned`}
                        {a.type === 'product_upvoted' && 'Upvote received'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                        {formatDate(a.ts as any)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">No recent activity</div>
              )}
            </CardContent>
          </Card>

          {/* Recent upvoters */}
          <Card className="col-span-12 md:col-span-6">
            <CardHeader>
              <CardTitle className="text-base">Recent upvoters</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(upvoters) && upvoters.length ? (
                <div className="flex -space-x-2">
                  {upvoters.map((u: any) => (
                    <Avatar key={u.id} className="ring-2 ring-background" title={`${u.user.firstName} ${u.user.lastName || ''}`}>
                      <AvatarFallback>
                        {(u.user.firstName?.[0] || '?')}{(u.user.lastName?.[0] || '')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No recent upvotes</div>
              )}
            </CardContent>
          </Card>
        </div>
      }
    />
  )
}
