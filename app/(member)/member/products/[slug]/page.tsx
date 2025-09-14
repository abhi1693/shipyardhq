import { notFound, redirect } from "next/navigation"
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
import ProductStatusMenu from "@/components/molecules/ProductStatusMenu"
import CopyButton from "@/components/molecules/CopyButton"
import DuplicateProductButton from "@/components/molecules/DuplicateProductButton"
import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import {
  getRecentUpvoters,
  validatePaymentAndAttachPlan,
  choosePlanAction,
} from "@/actions/member/products/actions"
import ShareOnXButton from "@/components/molecules/ShareOnXButton"
import { ExternalLink, Copy as CopyIcon } from "lucide-react"
import PerformanceCard from "@/components/molecules/PerformanceCard"
import { getPublicPlans } from "@/actions/public/plans/actions"
import { PlanType } from "@/lib/vendor/prisma/client"
// startPlanCheckoutAction and setProductPlanAction are used inside choosePlanAction
import { hasPlanFeature } from "@/lib/features"
import PurchasePlanToast from "@/components/molecules/PurchasePlanToast"

export default async function ViewUserProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const sp = (await searchParams) || {}
  const paymentId = (sp["payment_id"] as string) || ""
  const status = (sp["status"] as string) || ""

  if (paymentId && status) {
    await validatePaymentAndAttachPlan(paymentId)
    // Clean URL params regardless of outcome
    redirect(`/member/products/${slug}`)
  }
  const found = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  })
  const product = found ? await getProductById(found.id) : null
  if (!product) return notFound()
  const productId = product!.id
  const productSlug = product!.slug
  const { userId: clerkId } = await auth()
  const isOwner = Boolean(clerkId && product.user?.clerkId === clerkId)
  const publicPath = `/products/${productSlug}`
  const upvoters = await getRecentUpvoters(productId, 5).catch(() => [])

  const allPlans = await getPublicPlans({
    type: PlanType.one_time_price,
  }).catch(() => [])
  const currentPlanPublic = allPlans.find((p) => p.id === product.plan?.id)
  const nextPlan = (() => {
    const baseline = currentPlanPublic ? currentPlanPublic.price : -1
    const higher = allPlans
      .filter((p) => p.price > baseline)
      .sort((a, b) => a.price - b.price)
    if (higher.length) return higher[0]
    if (!currentPlanPublic) {
      const paid = allPlans
        .filter((p) => p.price > 0)
        .sort((a, b) => a.price - b.price)
      return paid[0]
    }
    return undefined
  })()

  const { deltaTop, deltaCount } = (() => {
    if (!nextPlan)
      return { deltaTop: [] as { id: string; name: string }[], deltaCount: 0 }
    const nextEnabled = nextPlan.features.filter((f) => f.enabled)
    const delta = nextEnabled.filter(
      (f) => !hasPlanFeature(product.plan ?? null, f.key),
    )
    return {
      deltaTop: delta.slice(0, 3).map((f) => ({ id: f.id, name: f.name })),
      deltaCount: delta.length,
    }
  })()

  const exclusiveCurrentTop: { id: string; name: string }[] = (() => {
    if (!currentPlanPublic) return []
    const cheaper = allPlans
      .filter((p) => p.price < currentPlanPublic.price)
      .sort((a, b) => b.price - a.price)
    const prev = cheaper[0]
    const currentEnabled = new Set(
      currentPlanPublic.features.filter((f) => f.enabled).map((f) => f.key),
    )
    const prevEnabled = new Set(
      (prev?.features || []).filter((f) => f.enabled).map((f) => f.key),
    )
    const exclusive = Array.from(currentEnabled).filter(
      (k) => !prevEnabled.has(k),
    )
    const nameByKey = new Map(
      currentPlanPublic.features.map((f) => [f.key, f.name] as const),
    )
    return exclusive
      .slice(0, 4)
      .map((key) => ({ id: key, name: nameByKey.get(key) || key }))
  })()

  const choosePlan = choosePlanAction.bind(null, {
    productId,
    redirectPath: `/member/products/${productSlug}`,
  })
  const showPlanUI = Boolean(currentPlanPublic)

  return (
    <>
      <PurchasePlanToast />
      <ObjectPageLayout
        heading={{
          id: product.slug,
          title: product.name,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          slug: product.id,
        }}
        overview={[
          {
            label: "Name",
            value: (
              <span className="inline-flex items-center gap-2">
                {product.name}
                <Link
                  href={publicPath}
                  target="_blank"
                  aria-label="View public page"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </span>
            ),
          },
          { label: "Category", value: product.category.name },
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
            ? ([
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
              ].filter(Boolean) as any)
            : []),
        ]}
        basePath="member/products"
        deletable
        editable
        headingActionsLeft={
          <div className="flex items-center gap-2">
            <ProductStatusMenu
              productId={product.id}
              status={product.status as any}
            />
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
          showPlanUI ? (
            <Card key="plan-top">
              <CardHeader>
                <CardTitle className="text-base">Plan</CardTitle>
              </CardHeader>
              <CardContent>
                {product.plan ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-medium text-foreground">
                        {product.plan.name}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span>{formatCurrency(product.plan.price) as any}</span>

                      {product.plan.isDefault ? (
                        <Badge variant="secondary">Default</Badge>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {product.plan && exclusiveCurrentTop.length ? (
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      Included only in {product.plan.name}
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {exclusiveCurrentTop.map((f) => (
                        <li
                          key={f.id}
                          className="text-xs text-foreground/90 before:content-['✓'] before:mr-2 before:text-green-600"
                        >
                          {f.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(() => {
                  const np = nextPlan
                  if (!np) return null
                  return (
                    <div className="mt-3 rounded-md border p-3 bg-muted/30">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-sm">
                          <span className="font-medium">
                            Unlock more with {np!.name}
                          </span>
                          <div className="mt-1 flex items-baseline gap-2">
                            {(() => {
                              const nf = new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              })
                              const pctRaw = np!.discount ?? 0
                              const pct = Math.min(Math.max(pctRaw, 0), 100)
                              const originalCents = np!.price
                              const discountedCents =
                                pct > 0 && pct < 100
                                  ? Math.round(originalCents * (1 - pct / 100))
                                  : originalCents
                              const original =
                                pct > 0 && pct < 100
                                  ? nf.format(originalCents / 100)
                                  : null
                              const priceText = nf.format(discountedCents / 100)
                              return (
                                <>
                                  {original && (
                                    <span className="text-xs text-muted-foreground line-through">
                                      {original}
                                    </span>
                                  )}
                                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                                    {priceText}
                                  </span>
                                  {pct > 0 ? (
                                    <span className="text-[11px] inline-flex items-center rounded bg-green-100 text-green-800 border border-green-300 px-1.5 py-0.5">
                                      Save{" "}
                                      {new Intl.NumberFormat("en-US", {
                                        maximumFractionDigits: 2,
                                      }).format(pct)}
                                      %
                                    </span>
                                  ) : null}
                                </>
                              )
                            })()}
                          </div>
                        </div>
                        <form action={choosePlan} className="contents">
                          <input type="hidden" name="planId" value={np!.id} />
                          <Button
                            size="sm"
                            className="transition-transform hover:-translate-y-0.5"
                          >
                            Buy now
                          </Button>
                        </form>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Instant activation after payment. Boost lasts{" "}
                        {(np as any).boostForDays ?? 1} day(s).
                      </div>
                      {np!.description ? (
                        <div className="mt-1 text-xs text-foreground/90">
                          {np!.description}
                        </div>
                      ) : null}
                      {deltaTop.length ? (
                        <>
                          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {deltaTop.map((f) => (
                              <li
                                key={f.id}
                                className="text-xs text-foreground/90 before:content-['+'] before:mr-2 before:text-green-600"
                              >
                                {f.name}
                              </li>
                            ))}
                          </ul>
                          {deltaCount > deltaTop.length ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              …and {deltaCount - deltaTop.length} more benefits
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  )
                })()}

                {(() => {
                  const currentPrice = currentPlanPublic
                    ? currentPlanPublic.price
                    : 0
                  const upgradableAll = allPlans.filter(
                    (p) => p.price > currentPrice,
                  )
                  const upgradable = nextPlan
                    ? upgradableAll.filter((p) => p.id !== nextPlan.id)
                    : upgradableAll
                  if (!upgradable.length) return null
                  return (
                    <div id="plan-upsell" className="mt-4">
                      <div className="mb-2 text-sm font-medium">
                        Other plans
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {upgradable.map((p) => (
                          <form
                            key={p.id}
                            action={choosePlan}
                            className="contents"
                          >
                            <input type="hidden" name="planId" value={p.id} />
                            <div className="rounded-md border p-3 h-full">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold truncate">
                                  {p.name}
                                </div>
                                {p.isDefault ? (
                                  <Badge variant="secondary">Default</Badge>
                                ) : null}
                              </div>
                              <div className="mt-1 flex items-baseline gap-2">
                                {(() => {
                                  const nf = new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                  })
                                  const pctRaw = p.discount ?? 0
                                  const pct = Math.min(Math.max(pctRaw, 0), 100)
                                  const originalCents = p.price
                                  const discountedCents =
                                    pct > 0 && pct < 100
                                      ? Math.round(
                                          originalCents * (1 - pct / 100),
                                        )
                                      : originalCents
                                  const original =
                                    pct > 0 && pct < 100
                                      ? nf.format(originalCents / 100)
                                      : null
                                  const priceText = nf.format(
                                    discountedCents / 100,
                                  )
                                  return (
                                    <>
                                      {original && (
                                        <span className="text-xs text-muted-foreground line-through">
                                          {original}
                                        </span>
                                      )}
                                      <span className="text-2xl font-extrabold tracking-tight">
                                        {priceText}
                                      </span>
                                      {pct > 0 ? (
                                        <span className="text-[10px] inline-flex items-center rounded bg-green-100 text-green-800 border border-green-300 px-1 py-0.5">
                                          Save{" "}
                                          {new Intl.NumberFormat("en-US", {
                                            maximumFractionDigits: 2,
                                          }).format(pct)}
                                          %
                                        </span>
                                      ) : null}
                                    </>
                                  )
                                })()}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                for {(p as any).boostForDays ?? 0} day(s)
                              </div>
                              {p.description ? (
                                <div className="mt-1 text-xs text-foreground/90 line-clamp-3">
                                  {p.description}
                                </div>
                              ) : null}
                              <div className="mt-3">
                                <Button
                                  size="sm"
                                  className="w-full transition-transform hover:-translate-y-0.5"
                                >
                                  Buy now
                                </Button>
                              </div>
                            </div>
                          </form>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          ) : null,
        ]}
        relationships={
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
                          product.platforms.map((p) => p.replaceAll("_", " ")),
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
                  media={(product.ProductMedia || []).map((m) => ({
                    id: m.id,
                    imageUrl: m.imageUrl,
                  }))}
                  canEdit={isOwner}
                  max={6}
                />
              </CardContent>
            </Card>
            <PerformanceCard
              upvotes={product.analytics?.upvotes ?? 0}
              clicks={product.analytics?.clicks ?? 0}
              upvoters={upvoters as any}
              badges={(product.ProductBadge || []) as any}
              productName={product.name}
              tagline={product.tagline}
              hasBanner={Boolean(product.bannerImage)}
              ogImageUrl={product.bannerImage || product.logo}
              editHref={`/member/products/${product.slug}/edit`}
            />
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
          </div>
        }
      />
    </>
  )
}
