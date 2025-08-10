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
  getProductActivity,
  getRecentUpvoters,
  validatePaymentAndAttachPlan,
} from "@/actions/member/products/actions"
// ShareOnX badge is still available elsewhere; header uses ShareOnXButton
import ShareOnXButton from "@/components/molecules/ShareOnXButton"
import { ExternalLink, Copy as CopyIcon } from "lucide-react"
import PerformanceCard from "@/components/molecules/PerformanceCard"
import { getPublicPlans } from "@/actions/public/plans/actions"
import { startPlanCheckoutAction } from "@/actions/member/products/actions"

export default async function ViewUserProductPage({
  params,
  searchParams,
}: {
  params: { slug: string }
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
  const { userId: clerkId } = await auth()
  const isOwner = Boolean(clerkId && product.user?.clerkId === clerkId)
  const publicPath = `/products/${product.slug}`
  const activity = await getProductActivity(product.id, 30, 12).catch(() => [])
  const upvoters = await getRecentUpvoters(product.id, 5).catch(() => [])

  // Upsell: compute next higher plan and feature deltas
  const allPlans = await getPublicPlans().catch(() => [])
  const currentPlanPublic = product.plan
    ? allPlans.find((p) => p.id === product.plan!.id)
    : undefined
  const nextPlan = (() => {
    const baseline = currentPlanPublic ? currentPlanPublic.price : -1
    const higher = allPlans
      .filter((p) => p.price > baseline)
      .sort((a, b) => a.price - b.price)
    if (higher.length) return higher[0]
    // If no current plan, suggest the first paid plan; else no upsell
    if (!currentPlanPublic) {
      const paid = allPlans.filter((p) => p.price > 0).sort((a, b) => a.price - b.price)
      return paid[0]
    }
    return undefined
  })()

  const { deltaTop, deltaCount } = (() => {
    if (!nextPlan) return { deltaTop: [] as { id: string; name: string }[], deltaCount: 0 }
    const currentKeys = new Set(
      (product.plan?.assignments || [])
        .filter((a: any) => a.enabled && a.feature?.key)
        .map((a: any) => a.feature.key as string),
    )
    const nextEnabled = nextPlan.features.filter((f) => f.enabled)
    const delta = nextEnabled.filter((f) => !currentKeys.has(f.key))
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
    const exclusive = Array.from(currentEnabled).filter((k) => !prevEnabled.has(k))
    // Map back to names using current plan feature list
    const nameByKey = new Map(
      currentPlanPublic.features.map((f) => [f.key, f.name] as const),
    )
    return exclusive.slice(0, 4).map((key) => ({ id: key, name: nameByKey.get(key) || key }))
  })()

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
        // Plan emphasized in top row
        <Card key="plan-top">
          <CardHeader>
            <CardTitle className="text-base">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {product.plan ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium text-foreground">{product.plan.name}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>{formatCurrency(product.plan.price) as any}</span>
                  {product.plan.type === "one_time_price" ? (
                    <span className="ml-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">One-time</span>
                  ) : (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span>
                        every {product.plan.frequency} {product.plan.interval}
                        {product.plan.frequency > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                  {product.plan.trialDays ? (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span>{product.plan.trialDays} day trial</span>
                    </>
                  ) : null}
                  {product.plan.isDefault ? (
                    <Badge variant="secondary">Default</Badge>
                  ) : null}
                </div>
                <div className="shrink-0">
                  <Link href={`/member/products/${product.slug}/plan`}>
                    <Button variant="outline" size="sm">Change plan</Button>
                  </Link>
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
                    <li key={f.id} className="text-xs text-foreground/90 before:content-['✓'] before:mr-2 before:text-green-600">
                      {f.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">No plan selected</span>
                <Link href={`/member/products/${product.slug}/plan`}>
                  <Button size="sm">Choose a plan</Button>
                </Link>
              </div>
            )}
            {nextPlan ? (
              <div className="mt-3 rounded-md border p-3 bg-muted/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium">Unlock more with {nextPlan.name}</span>
                    <span className="mx-2 text-muted-foreground">•</span>
                    <span className="text-muted-foreground inline-flex items-center gap-2">
                      {(() => {
                        const price = formatCurrency(nextPlan.price) as any
                        if (nextPlan.discount) {
                          const original = nextPlan.price + (nextPlan.discount || 0)
                          return (
                            <>
                              <span className="line-through opacity-70">{formatCurrency(original) as any}</span>
                              <span>{price}</span>
                              <span className="text-green-600">Save {formatCurrency(nextPlan.discount) as any}</span>
                            </>
                          )
                        }
                        return <>{price}</>
                      })()}
                      {nextPlan.type === "one_time_price" ? (
                        <span className="ml-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">One-time</span>
                      ) : (
                        <span className="ml-1 text-xs">/ {nextPlan.frequency} {nextPlan.interval}{nextPlan.frequency > 1 ? "s" : ""}</span>
                      )}
                    </span>
                  </div>
                  {(() => {
                    async function upgradeNow(formData: FormData) {
                      "use server"
                      const pid = formData.get("planId")?.toString() || ""
                      if (!pid) return
                      // If we can checkout directly, do it; otherwise go to selection page
                      if (nextPlan.externalId && nextPlan.price > 0) {
                        const session = await startPlanCheckoutAction(product.id, pid)
                        if ((session as any)?.paymentLink) {
                          redirect((session as any).paymentLink)
                        }
                      }
                      redirect(`/member/products/${product.slug}/plan?highlight=${pid}`)
                    }
                    return (
                      <form action={upgradeNow} className="contents">
                        <input type="hidden" name="planId" value={nextPlan.id} />
                        <Button size="sm">{nextPlan.type === "one_time_price" ? `Buy ${nextPlan.name}` : `Upgrade to ${nextPlan.name}`}</Button>
                      </form>
                    )
                  })()}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">Instant activation after payment.</div>
                {deltaTop.length ? (
                  <>
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {deltaTop.map((f) => (
                        <li key={f.id} className="text-xs text-foreground/90 before:content-['+'] before:mr-2 before:text-green-600">
                          {f.name}
                        </li>
                      ))}
                    </ul>
                    {deltaCount > deltaTop.length ? (
                      <div className="mt-1 text-xs text-muted-foreground">…and {deltaCount - deltaTop.length} more benefits</div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>,
        
        
      ]}
      relationships={
        <div className="grid grid-cols-12 gap-6">
          {/* Branding first */}
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

          {/* Organization & Targeting second */}
          <Card className="col-span-12 md:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">Organization & Targeting</CardTitle>
            </CardHeader>
            <CardContent>
              <OverviewRow
                label="Organization"
                value={
                  product.organization
                    ? (
                        <div className="flex items-center gap-2">
                          <span>{product.organization.name}</span>
                          {product.organization.url
                            ? linkify({
                                href: product.organization.url,
                                label: new URL(product.organization.url).hostname,
                                isExternal: true,
                              })
                            : null}
                        </div>
                      )
                    : placeholder()
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

          {/* Primary setup: Links + Performance */}
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
          {/* Media + Performance in same row (media wider) */}
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
