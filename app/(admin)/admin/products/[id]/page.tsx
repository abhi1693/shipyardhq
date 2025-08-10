import { notFound } from "next/navigation"
import { getProductById } from "@/actions/admin/products/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { OverviewRow } from "@/components/layout/object-view/overview"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { VerifyDomainButton } from "@/components/molecules/VerifyDomainButton"
import {
  formatBoolean,
  formatDate,
  image,
  linkify,
  placeholder,
} from "@/lib/ui/formatters"
import { AssignedFeatureOfPlanRelationship } from "@/app/(admin)/admin/products/[id]/relationships/features"

export default async function ViewProductPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const product = await getProductById(id)
  if (!product) return notFound()

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
        { label: "Slug", value: product.slug },
        {
          label: "Category",
          value: linkify({
            href: `/admin/categories/${product.category.id}`,
            label: product.category.name,
          }),
        },
        {
          label: "Created By",
          value: linkify({
            href: `/admin/users/${product.user.id}`,
            label: `${product.user.firstName} ${product.user.lastName}`,
            subtext: product.user.email,
          }),
        },
        {
          label: "Organization",
          value: product.organization
            ? linkify({
                href: "#",
                label: product.organization.name,
              })
            : placeholder(),
        },
        {
          label: "Type",
          value: product.type ?? placeholder(),
        },
        {
          label: "Pricing Model",
          value: product.pricingModel ?? placeholder(),
        },
        { label: "Status", value: product.status },
        {
          label: "Published At",
          value: product.publishedAt
            ? formatDate(product.publishedAt)
            : placeholder(),
        },
        {
          label: "Starting Price",
          value:
            product.startingPriceCents != null
              ? `${(product.startingPriceCents / 100).toFixed(2)} ${product.currencyCode || "USD"}`
              : placeholder(),
        },
        {
          label: "Plan",
          value: product.plan
            ? linkify({
                href: `/admin/plans/${product.plan.id}`,
                label: product.plan.name,
              })
            : placeholder(),
        },
      ]}
      basePath="admin/products"
      deletable
      editable
      relationships={
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Metadata Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <OverviewRow
                  label="Banner Image"
                  value={
                    product.bannerImage
                      ? image(product.bannerImage, product.name, 128, 40)
                      : placeholder()
                  }
                />
                <OverviewRow
                  label="Website URL"
                  value={linkify({
                    href: product.websiteUrl,
                    label: product.websiteUrl,
                    isExternal: true,
                  })}
                />
                <OverviewRow label="Tagline" value={product.tagline} />
                <OverviewRow label="Description" value={product.description} />
                <OverviewRow
                  label="Logo"
                  value={image(product.logo, product.name, 64, 64)}
                />
                <OverviewRow
                  label="Company"
                  value={product.companyName || placeholder()}
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
                  label="Platforms"
                  value={
                    product.platforms && product.platforms.length
                      ? product.platforms
                          .map((p) => p.replaceAll("_", " "))
                          .join(", ")
                      : placeholder()
                  }
                />
                <OverviewRow
                  label="Tags"
                  value={
                    product.keywords && product.keywords.length
                      ? product.keywords.join(", ")
                      : placeholder()
                  }
                />
                {product.metadata && (
                  <>
                    <OverviewRow
                      label="GitHub"
                      value={
                        product.metadata.githubUrl
                          ? linkify({
                              href: product.metadata.githubUrl,
                              label: product.metadata.githubUrl,
                              isExternal: true,
                            })
                          : placeholder()
                      }
                    />
                    <OverviewRow
                      label="Twitter"
                      value={
                        product.metadata.twitterUrl
                          ? linkify({
                              href: product.metadata.twitterUrl,
                              label: product.metadata.twitterUrl,
                              isExternal: true,
                            })
                          : placeholder()
                      }
                    />
                    <OverviewRow
                      label="Demo"
                      value={
                        product.metadata.demoUrl
                          ? linkify({
                              href: product.metadata.demoUrl,
                              label: product.metadata.demoUrl,
                              isExternal: true,
                            })
                          : placeholder()
                      }
                    />
                    <OverviewRow
                      label="Contact Email"
                      value={product.metadata.contactEmail || placeholder()}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Verification Card */}
            {product.verification && (
              <Card>
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

                  {/* Verify Button (only if not verified) */}
                  <OverviewRow
                    label="Verify Domain"
                    value={<VerifyDomainButton productId={product.id} />}
                  />
                </CardContent>
              </Card>
            )}

            {/* Analytics Card */}
            {product.analytics && (
              <Card className="md:col-span-2">
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
          {product.plan?.assignments && (
            <AssignedFeatureOfPlanRelationship
              rows={product.plan.assignments}
            />
          )}
        </>
      }
    />
  )
}
