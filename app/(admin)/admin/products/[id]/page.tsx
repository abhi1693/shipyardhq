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
import Image from "next/image"

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
        {
          label: "Category",
          value: (
            <a
              href={`/admin/categories/${product.category.id}`}
              className="text-blue-600 underline"
            >
              {product.category.name}
            </a>
          ),
        },
        {
          label: "Created By",
          value: (
            <a
              href={`/admin/users/${product.user.id}`}
              className="text-blue-600 underline"
            >
              {product.user.email}
            </a>
          ),
        },
      ]}
      basePath="products"
      deletable
      editable
      relationships={
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <OverviewRow
                label="Website URL"
                value={
                  <a
                    href={product.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    {product.websiteUrl}
                  </a>
                }
              />
              <OverviewRow label="Tagline" value={product.tagline} />
              <OverviewRow
                label="Logo"
                value={
                  <Image
                    src={product.logo}
                    alt={product.name}
                    width={64}
                    height={64}
                    className="rounded bg-white border object-contain"
                  />
                }
              />
              {product.metadata && (
                <>
                  <OverviewRow
                    label="GitHub"
                    value={
                      product.metadata.githubUrl ? (
                        <a
                          href={product.metadata.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {product.metadata.githubUrl}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <OverviewRow
                    label="Twitter"
                    value={
                      product.metadata.twitterUrl ? (
                        <a
                          href={product.metadata.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {product.metadata.twitterUrl}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <OverviewRow
                    label="Demo"
                    value={
                      product.metadata.demoUrl ? (
                        <a
                          href={product.metadata.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {product.metadata.demoUrl}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <OverviewRow
                    label="Contact Email"
                    value={product.metadata.contactEmail || "—"}
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
                  value={
                    product.verification.isVerified ? (
                      <span className="text-green-600 font-medium">✅ Yes</span>
                    ) : (
                      <span className="text-red-600 font-medium">❌ No</span>
                    )
                  }
                />
                <OverviewRow
                  label="Verified At"
                  value={
                    product.verification.verifiedAt
                      ? new Date(
                          product.verification.verifiedAt,
                        ).toLocaleString()
                      : "—"
                  }
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
      }
    />
  )
}
