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

export default async function ViewUserProductPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const product = await getProductById(id)
  if (!product) return notFound()
  const { userId: clerkId } = await auth()
  const isOwner = Boolean(clerkId && product.user?.clerkId === clerkId)

  return (
    <ObjectPageLayout
      heading={{
        id: product.id,
        title: product.name,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }}
      overview={[
        { label: "Name", value: product.name },
        { label: "Category", value: product.category.name },
        { label: "Status", value: product.status },
        { label: "Type", value: product.type.replace("_", " ") },
      ]}
      basePath="member/products"
      deletable
      editable
      relationships={
        <div className="grid grid-cols-12 gap-6">
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
                  product.keywords?.length
                    ? commaSeparated(product.keywords)
                    : placeholder()
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
                  value={product.verification.verificationTxt}
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
              <ProductMediaManager
                productId={product.id}
                media={(product.ProductMedia || []).map((m) => ({
                  id: m.id,
                  imageUrl: m.imageUrl,
                }))}
                canEdit={isOwner}
                max={4}
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
                      <span className="text-xs text-muted-foreground">
                        {b.expiresAt
                          ? `Expires ${new Date(b.expiresAt).toLocaleDateString()}`
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
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 text-center gap-4">
                <div>
                  <div className="text-xl font-bold">
                    {product.analytics.views}
                  </div>
                  <div className="text-sm text-muted-foreground">Views</div>
                </div>
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
        </div>
      }
    />
  )
}
