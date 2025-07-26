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
} from "@/lib/ui/formatters"
import { VerifyDomainButton } from "@/components/molecules/VerifyDomainButton"
import { getProductById } from "@/actions/admin/products/actions"

export default async function ViewUserProductPage({
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
        {
          label: "Category",
          value: product.category.name,
        },
      ]}
      basePath="products"
      relationships={
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <OverviewRow
                label="Website URL"
                value={linkify({
                  href: product.websiteUrl,
                  label: product.websiteUrl,
                  isExternal: true,
                })}
              />
              <OverviewRow label="Tagline" value={product.tagline} />
              <OverviewRow
                label="Logo"
                value={image(product.logo, product.name, 64, 64)}
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

          {/* Verification */}
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
                {!product.verification.isVerified && (
                  <OverviewRow
                    label="Verify Domain"
                    value={<VerifyDomainButton productId={product.id} />}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Analytics */}
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
      }
    />
  )
}
