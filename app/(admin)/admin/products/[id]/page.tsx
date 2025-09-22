import { notFound } from "next/navigation"
import {
  assignProductPlanAction,
  getProductById,
} from "@/actions/admin/products/actions"
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
  commaSeparated,
  formatCurrency,
  slug as slugFmt,
} from "@/lib/ui/formatters"
import { AssignedFeatureOfPlanRelationship } from "@/app/(admin)/admin/products/[id]/relationships/features"
import { getPlans } from "@/actions/admin/plans/actions"
import { Button } from "@/components/atoms/button"
// Use native select for simple server action submission
import { revalidatePath } from "next/cache"
import ProductStatusMenu from "@/components/molecules/ProductStatusMenu"
import CopyButton from "@/components/molecules/CopyButton"
import ShareOnXButton from "@/components/molecules/ShareOnXButton"
import DuplicateProductButton from "@/components/molecules/DuplicateProductButton"
import ProductMediaManager from "@/components/molecules/ProductMediaManager"
import PerformanceCard from "@/components/molecules/PerformanceCard"
import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { BarChart3 } from "lucide-react"
import { getRecentProductUpvoters } from "@/lib/server/productUpvotes"
import { adminPath, productPath } from "@/lib/routes"

export default async function ViewProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, plans] = await Promise.all([
    getProductById(id),
    getPlans({ select: { id: true, name: true, type: true, price: true } }),
  ])
  if (!product) return notFound()
  const productId = product.id
  const productSlug = product.slug
  const publicPath = productPath(productSlug)
  const recentUpvoters = await getRecentProductUpvoters(productId, 8).catch(
    () => [],
  )

  async function assignPlan(formData: FormData) {
    "use server"
    const planIdRaw = formData.get("planId")?.toString() || ""
    const planId = planIdRaw.length ? planIdRaw : null
    await assignProductPlanAction(productId, planId)
    revalidatePath(adminPath("products", productId))
  }

  return (
    <ObjectPageLayout
      heading={{
        id: product.id,
        title: product.name,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }}
      headingActionsLeft={
        <div className="flex items-center gap-2">
          <ProductStatusMenu
            productId={product.id}
            status={product.status as any}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={adminPath("products", product.id, "analytics")}>
              <BarChart3 className="mr-2 h-4 w-4" /> Analytics
            </Link>
          </Button>
          <CopyButton
            text={publicPath}
            resolveAbsolute
            size="sm"
            variant="outline"
          >
            Copy link
          </CopyButton>
          <ShareOnXButton
            path={publicPath}
            productName={product.name}
            tagline={product.tagline}
          />
          <DuplicateProductButton productId={product.id} />
        </div>
      }
      overview={[
        { label: "Name", value: product.name },
        { label: "Slug", value: slugFmt(product.slug) },
        {
          label: "Category",
          value: linkify({
            href: adminPath("categories", product.category.id),
            label: product.category.name,
          }),
        },
        {
          label: "Created By",
          value: linkify({
            href: adminPath("users", product.user.id),
            label: `${product.user.firstName} ${product.user.lastName}`,
            subtext: product.user.email,
          }),
        },
        {
          label: "Organization",
          value: product.organization
            ? linkify({
                href: product.organization.url || "#",
                label: product.organization.name,
                isExternal: Boolean(product.organization.url),
              })
            : placeholder(),
        },
        {
          label: "Type",
          value: product.type?.replaceAll("_", " ") ?? placeholder(),
        },
        {
          label: "Pricing Model",
          value: product.pricingModel?.replaceAll("_", " ") ?? placeholder(),
        },
        {
          label: "Status",
          value: (
            <Badge
              variant={
                (product.status === "published"
                  ? "success"
                  : product.status === "draft"
                    ? "secondary"
                    : "outline") as any
              }
            >
              {product.status}
            </Badge>
          ),
        },
        {
          label: "Published At",
          value: product.publishedAt
            ? formatDate(product.publishedAt)
            : placeholder(),
        },
        {
          label: "Starting Price",
          value:
            product.startingPriceCents != null && product.currencyCode
              ? formatCurrency(product.startingPriceCents, product.currencyCode)
              : placeholder(),
        },
        {
          label: "Plan",
          value: product.plan
            ? linkify({
                href: adminPath("plans", product.plan.id),
                label: product.plan.name,
              })
            : placeholder(),
        },
      ]}
      basePath="admin/products"
      deletable
      editable
      topRowExtras={[
        product.plan ? (
          <Card key="plan-top">
            <CardHeader>
              <CardTitle className="text-base">Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-foreground">
                  {product.plan.name}
                </span>
                {product.plan.price != null ? (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span>{formatCurrency(product.plan.price) as any}</span>
                  </>
                ) : null}
                {product.plan.isDefault ? (
                  <Badge variant="secondary">Default</Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null,
      ]}
      relationships={
        <>
          <div className="grid grid-cols-12 gap-6">
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
              </CardContent>
            </Card>

            <Card className="col-span-12 md:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">
                  Organization & Targeting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OverviewRow
                  label="Organization"
                  value={
                    product.organization ? (
                      <div className="flex items-center gap-2">
                        <span>{product.organization.name}</span>
                        {product.organization.url
                          ? linkify({
                              href: product.organization.url,
                              isExternal: true,
                            })
                          : null}
                      </div>
                    ) : (
                      placeholder()
                    )
                  }
                />
                <OverviewRow
                  label="Platforms"
                  value={
                    product.platforms && product.platforms.length
                      ? commaSeparated(
                          product.platforms.map((p: string) =>
                            p.replaceAll("_", " "),
                          ),
                        )
                      : placeholder()
                  }
                />
                <OverviewRow
                  label="Tags"
                  value={
                    product.keywords && product.keywords.length
                      ? commaSeparated(product.keywords)
                      : placeholder()
                  }
                />
              </CardContent>
            </Card>

            <Card className="col-span-12 md:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Social & Links</CardTitle>
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

            <Card className="col-span-12 md:col-span-8">
              <CardHeader>
                <CardTitle className="text-base">Media Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-muted-foreground">
                    {`Images: ${(product.ProductMedia || []).length}/6`}
                  </div>
                  <div className="text-muted-foreground">
                    Tips: 3–6 screenshots (1280×720). Banner 1200×628.
                  </div>
                </div>
                <ProductMediaManager
                  productId={product.id}
                  media={
                    product.ProductMedia?.map(
                      (
                        m: NonNullable<typeof product.ProductMedia>[number],
                      ) => ({
                        id: m.id,
                        imageUrl: m.imageUrl,
                      }),
                    ) ?? []
                  }
                  canEdit
                  max={6}
                />
              </CardContent>
            </Card>

            <PerformanceCard
              upvotes={product.analytics?.upvotes ?? 0}
              clicks={product.analytics?.clicks ?? 0}
              upvoters={recentUpvoters as any}
              badges={(product.ProductBadge || []) as any}
              productName={product.name}
              tagline={product.tagline}
              hasBanner={Boolean(product.bannerImage)}
              ogImageUrl={product.bannerImage || product.logo}
              editHref={adminPath("products", product.id, "edit")}
            />

            {product.verification && (
              <Card className="col-span-12 md:col-span-6">
                <CardHeader>
                  <CardTitle className="text-base">Verification</CardTitle>
                </CardHeader>
                <CardContent>
                  <OverviewRow
                    label="Verification TXT"
                    value={
                      <div className="flex items-center gap-2">
                        <code className="text-xs">
                          {product.verification.verificationTxt}
                        </code>
                        <CopyButton
                          text={product.verification.verificationTxt}
                          size="sm"
                          variant="outline"
                        >
                          Copy
                        </CopyButton>
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
                  <OverviewRow
                    label="Verify Domain"
                    value={<VerifyDomainButton productId={product.id} />}
                  />
                </CardContent>
              </Card>
            )}

            {/* Plan assignment */}
            <Card className="col-span-12 md:col-span-6">
              <CardHeader>
                <CardTitle className="text-base">Plan Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={assignPlan} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm mb-2">Plan</label>
                    <select
                      name="planId"
                      defaultValue={product.plan?.id || ""}
                      className="border rounded-md px-3 py-2 text-sm w-full bg-transparent"
                    >
                      <option value="">No plan</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}{" "}
                          {p.price ? `— $${(p.price / 100).toFixed(2)}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" variant="outline">
                    Save
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Description with markdown */}
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
                    href={adminPath("products", product.id, "edit")}
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
              </CardContent>
            </Card>
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
