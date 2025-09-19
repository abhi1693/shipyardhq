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
  placeholder,
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
import {
  ExternalLink,
  Copy as CopyIcon,
  BarChart3,
  Building2,
  Globe,
  Target,
  Tag,
  MousePointerClick,
  Mail,
  Video,
  Github as GithubIcon,
  Twitter as TwitterIcon,
} from "lucide-react"
import PerformanceCard from "@/components/molecules/PerformanceCard"
import { getPublicPlans } from "@/actions/public/plans/actions"
import { PlanType } from "@/lib/vendor/prisma/client"
// startPlanCheckoutAction and setProductPlanAction are used inside choosePlanAction
import { hasPlanFeature } from "@/lib/features"
import PurchasePlanToast from "@/components/molecules/PurchasePlanToast"
import { JSX } from "react"

const chipIconClass = "h-3.5 w-3.5 text-muted-foreground"
const infoChipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
const accentChipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700"
const placeholderTextClass = "text-xs text-muted-foreground"
const calloutPanelClass =
  "rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
const dashedCalloutClass =
  "rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3"
const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground"
const actionGroupClass =
  "flex flex-wrap items-center gap-2 rounded-full bg-white/80 px-2 py-1 shadow-sm ring-1 ring-slate-200/70"

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
  const analyticsPath = `/member/products/${productSlug}/analytics`
  const canViewAnalytics = hasPlanFeature(
    product.plan ?? null,
    "analytics.advanced",
  )
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

  const formatHost = (value?: string | null) => {
    if (!value) return null
    try {
      const host = new URL(value).hostname.replace(/^www\./, "")
      return host || value
    } catch {
      return value
    }
  }

  const platforms = (product.platforms || []).map((platform) =>
    platform.replace(/_/g, " "),
  )
  const tags = product.keywords || []
  const organizationName = product.organization?.name ?? ""
  const organizationUrl = product.organization?.url ?? ""
  const organizationHost = organizationUrl ? formatHost(organizationUrl) : null
  const websiteHost = formatHost(product.websiteUrl) ?? product.websiteUrl
  const ctaLabel = product.ctaLabel ?? ""
  const ctaUrl = product.ctaUrl ?? ""
  const hasCtaPair = Boolean(ctaLabel && ctaUrl)
  const metadata = product.metadata

  const extraLinks: Array<{
    key: string
    label: string
    href: string
    icon: JSX.Element
  }> = []

  if (organizationUrl) {
    extraLinks.push({
      key: "organization-url",
      label: organizationHost ?? organizationUrl,
      href: organizationUrl,
      icon: <Building2 className={chipIconClass} />,
    })
  }

  if (metadata?.githubUrl) {
    const href = metadata.githubUrl
    extraLinks.push({
      key: "github",
      label: formatHost(href) ?? href,
      href,
      icon: <GithubIcon className={chipIconClass} />,
    })
  }

  if (metadata?.twitterUrl) {
    const href = metadata.twitterUrl
    extraLinks.push({
      key: "twitter",
      label: formatHost(href) ?? href,
      href,
      icon: <TwitterIcon className={chipIconClass} />,
    })
  }

  if (metadata?.demoUrl) {
    const href = metadata.demoUrl
    extraLinks.push({
      key: "demo",
      label: formatHost(href) ?? href,
      href,
      icon: <Video className={chipIconClass} />,
    })
  }

  if (metadata?.contactEmail) {
    extraLinks.push({
      key: "contact",
      label: metadata.contactEmail,
      href: `mailto:${metadata.contactEmail}`,
      icon: <Mail className={chipIconClass} />,
    })
  }

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
          <div className="flex flex-wrap items-center gap-3">
            <div className={actionGroupClass}>
              <ProductStatusMenu
                productId={product.id}
                status={product.status as any}
                triggerClassName="h-8 px-3"
              />
              {isOwner && canViewAnalytics ? (
                <Button variant="ghost" size="sm" className="h-8 px-3" asChild>
                  <Link href={analyticsPath}>
                    <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                  </Link>
                </Button>
              ) : null}
            </div>

            <div className={actionGroupClass}>
              <CopyButton
                text={publicPath}
                resolveAbsolute
                size="sm"
                variant="secondary"
                className="h-8 px-3"
              >
                <>
                  <CopyIcon className="mr-2 h-4 w-4" /> Copy link
                </>
              </CopyButton>
              <ShareOnXButton
                path={publicPath}
                productName={product.name}
                variant="ghost"
                className="h-8 px-3"
              />
              <DuplicateProductButton
                productId={product.id}
                variant="ghost"
                className="h-8 px-3"
              />
            </div>
          </div>
        }
        topRowExtras={[
          showPlanUI ? (
            <Card key="plan-top">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                {product.plan ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                      {product.plan.name}
                      {product.plan.isDefault ? (
                        <Badge variant="outline">Default</Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(product.plan.price) as any}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No plan currently attached.
                  </p>
                )}
                {product.plan && exclusiveCurrentTop.length ? (
                  <div className={dashedCalloutClass}>
                    <div className="text-xs font-semibold text-foreground">
                      Included only in {product.plan.name}
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {exclusiveCurrentTop.map((f) => (
                        <li key={f.id}>• {f.name}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(() => {
                  const np = nextPlan
                  if (!np) return null
                  const nf = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  })
                  const pctRaw = np.discount ?? 0
                  const pct = Math.min(Math.max(pctRaw, 0), 100)
                  const originalCents = np.price
                  const discountedCents =
                    pct > 0 && pct < 100
                      ? Math.round(originalCents * (1 - pct / 100))
                      : originalCents
                  const original =
                    pct > 0 && pct < 100 ? nf.format(originalCents / 100) : null
                  const priceText = nf.format(discountedCents / 100)
                  return (
                    <div className={calloutPanelClass}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Unlock more with {np.name}
                          </div>
                          <div className="mt-1 flex flex-wrap items-baseline gap-2">
                            {original ? (
                              <span className="text-xs text-muted-foreground line-through">
                                {original}
                              </span>
                            ) : null}
                            <span className="text-2xl font-semibold text-foreground">
                              {priceText}
                            </span>
                            {pct > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                Save{" "}
                                {new Intl.NumberFormat("en-US", {
                                  maximumFractionDigits: 2,
                                }).format(pct)}
                                %
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Activation is instant. Boost lasts {(np as any).boostForDays ?? 1} day(s).
                          </p>
                          {np.description ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {np.description}
                            </p>
                          ) : null}
                        </div>
                        <form action={choosePlan} className="flex-shrink-0">
                          <input type="hidden" name="planId" value={np.id} />
                          <Button variant="outline" size="sm">
                            Buy now
                          </Button>
                        </form>
                      </div>
                      {deltaTop.length ? (
                        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">You also get</div>
                          <ul className="space-y-1">
                            {deltaTop.map((f) => (
                              <li key={f.id}>+ {f.name}</li>
                            ))}
                          </ul>
                          {deltaCount > deltaTop.length ? (
                            <div>…and {deltaCount - deltaTop.length} more benefits</div>
                          ) : null}
                        </div>
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
                    <div className="space-y-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                        Other plans
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {upgradable.map((p) => {
                          const nf = new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          })
                          const pctRaw = p.discount ?? 0
                          const pct = Math.min(Math.max(pctRaw, 0), 100)
                          const originalCents = p.price
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
                            <form key={p.id} action={choosePlan} className="contents">
                              <input type="hidden" name="planId" value={p.id} />
                              <div className={calloutPanelClass}>
                                <div className="flex items-center justify-between text-sm font-medium text-foreground">
                                  <span className="truncate">{p.name}</span>
                                  {p.isDefault ? (
                                    <Badge variant="outline">Default</Badge>
                                  ) : null}
                                </div>
                                <div className="mt-2 flex flex-wrap items-baseline gap-2 text-xs text-muted-foreground">
                                  {original ? (
                                    <span className="line-through">{original}</span>
                                  ) : null}
                                  <span className="text-lg font-semibold text-foreground">
                                    {priceText}
                                  </span>
                                  {pct > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                      Save{" "}
                                      {new Intl.NumberFormat("en-US", {
                                        maximumFractionDigits: 2,
                                      }).format(pct)}
                                      %
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                  Boosts your launch for {(p as any).boostForDays ?? 0} day(s)
                                </div>
                                {p.description ? (
                                  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                                    {p.description}
                                  </p>
                                ) : null}
                                <div className="mt-3">
                                  <Button variant="outline" size="sm" className="w-full">
                                    Buy now
                                  </Button>
                                </div>
                              </div>
                            </form>
                          )
                        })}
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
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <span className={sectionLabelClass}>
                    Organization
                  </span>
                  {organizationName ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={infoChipClass}>
                        <Building2 className={chipIconClass} />
                        {organizationName}
                      </span>
                      {organizationUrl ? (
                        <Link
                          href={organizationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={accentChipClass}
                        >
                          <Globe className={chipIconClass} />
                          <span className="truncate max-w-[12rem]">
                            {organizationHost ?? organizationUrl}
                          </span>
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <span className={placeholderTextClass}>{placeholder()}</span>
                  )}
                </div>
                <div className="space-y-2">
                  <span className={sectionLabelClass}>
                    Platforms
                  </span>
                  {platforms.length ? (
                    <div className="flex flex-wrap gap-2">
                      {platforms.map((platform) => (
                        <span className={infoChipClass} key={platform}>
                          <Target className={chipIconClass} />
                          {platform}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className={placeholderTextClass}>{placeholder()}</span>
                  )}
                </div>
                <div className="space-y-2">
                  <span className={sectionLabelClass}>
                    Keywords
                  </span>
                  {tags.length ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tagValue) => (
                        <span className={accentChipClass} key={tagValue}>
                          <Tag className={chipIconClass} />
                          {tagValue}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className={placeholderTextClass}>{placeholder()}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-12 md:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <span className={sectionLabelClass}>
                    Website
                  </span>
                  {product.websiteUrl ? (
                    <div className="space-y-1">
                      <Link
                        href={product.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${accentChipClass} max-w-full`}
                      >
                        <span className="truncate max-w-[18rem]">{websiteHost}</span>
                      </Link>
                    </div>
                  ) : (
                    <span className={placeholderTextClass}>{placeholder()}</span>
                  )}
                </div>
                <div className="space-y-2">
                  <span className={sectionLabelClass}>
                    Primary CTA
                  </span>
                  {hasCtaPair ? (
                    <div className="space-y-1">
                      <span className={infoChipClass}>
                        <MousePointerClick className={chipIconClass} /> CTA label
                      </span>
                      <Link
                        href={ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${accentChipClass} max-w-full`}
                      >
                        <span className="truncate max-w-[18rem]">{ctaLabel}</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className={placeholderTextClass}>{placeholder()}</span>
                      {(ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl) ? (
                        <p className="text-xs text-destructive">
                          Tip: Provide both CTA label and URL for a complete
                          call-to-action.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <span className={sectionLabelClass}>
                    Additional Links
                  </span>
                  {extraLinks.length ? (
                    <div className="flex flex-wrap gap-2">
                      {extraLinks.map(({ key, href, label, icon }) => {
                        const isExternal = href.startsWith("http")
                        const content = (
                          <>
                            {icon}
                            <span className="truncate max-w-[12rem]">{label}</span>
                          </>
                        )
                        return isExternal ? (
                          <Link
                            key={key}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${accentChipClass} max-w-full`}
                          >
                            {content}
                          </Link>
                        ) : (
                          <a
                            key={key}
                            href={href}
                            className={`${accentChipClass} max-w-full`}
                          >
                            {content}
                          </a>
                        )
                      })}
                    </div>
                  ) : (
                    <span className={placeholderTextClass}>{placeholder()}</span>
                  )}
                </div>
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
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                  {(() => {
                    const len = (product.description || "").trim().length
                    const good = len >= 200
                    return (
                      <div>
                        Quality:{" "}
                        <span className={good ? "text-emerald-600" : "text-amber-600"}>
                          {good ? "Good" : "Needs work"}
                        </span>{" "}
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
                <div className="prose prose-sm max-w-none text-foreground">
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
