import Link from "next/link"
import { IconCheck } from "@tabler/icons-react"
import type { PublicPlan } from "@/actions/public/plans/actions"
import { Button } from "@/components/atoms/button"
import { MEMBER_ORGANIZATIONS_PATH } from "@/lib/routes"

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const HIGHLIGHT_PRIORITY = [
  "organization",
  "analytics.advanced",
  "analytics.basic",
  "product.sitemap",
  "priorityPlacement",
  "homepage",
  "featured",
  "backlink",
] as const

const highlightIndex = new Map<string, number>(
  HIGHLIGHT_PRIORITY.map((key, index) => [key, index] as const),
)

export function SubscriptionPlanCard({ plan }: { plan: PublicPlan }) {
  const priceCents = plan.price ?? 0
  const isFree = priceCents === 0
  const discountRaw = plan.discount ?? 0
  const discountPct = Math.min(Math.max(discountRaw, 0), 100)
  const hasDiscount = !isFree && discountPct > 0 && discountPct < 100
  const discountedCents = hasDiscount
    ? Math.round(priceCents * (1 - discountPct / 100))
    : priceCents
  const priceLabel = isFree ? "Free" : USD.format(discountedCents / 100)
  const originalPrice = hasDiscount ? USD.format(priceCents / 100) : null
  const formattedDiscount = hasDiscount
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
        discountPct,
      )
    : null
  const cadence = plan.priceSuffix ?? "per month"
  const enabledFeatures = plan.features.filter((feature) => feature.enabled)
  const prioritizedFeatures = [...enabledFeatures]
    .sort((a, b) => {
      const aIndex = highlightIndex.get(a.key) ?? Number.MAX_SAFE_INTEGER
      const bIndex = highlightIndex.get(b.key) ?? Number.MAX_SAFE_INTEGER
      return aIndex - bIndex
    })
    .slice(0, 4)
  const includesOrganization = enabledFeatures.some(
    (feature) => feature.key === "organization",
  )

  return (
    <article className="flex h-full flex-col gap-5 rounded-2xl border border-[color:var(--brand-1)/0.22] bg-background/90 p-6 shadow-[0_22px_60px_-45px_rgba(7,58,104,0.6)] backdrop-blur">
      <header className="space-y-2">
        <span className="inline-flex items-center rounded-full border border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
          Subscription
        </span>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
          {plan.description ? (
            <p className="text-sm text-muted-foreground leading-snug">
              {plan.description}
            </p>
          ) : null}
        </div>
      </header>

      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-2 text-[color:var(--brand-1)]">
          {hasDiscount && originalPrice ? (
            <span className="text-sm text-foreground/60 line-through">
              {originalPrice}
            </span>
          ) : null}
          <span className="text-3xl font-bold tracking-tight">
            {priceLabel}
          </span>
          {!isFree ? (
            <span className="text-sm text-muted-foreground">{cadence}</span>
          ) : null}
        </div>
        {hasDiscount && formattedDiscount ? (
          <span className="inline-flex w-fit items-center rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            Save {formattedDiscount}%
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Included resources
        </span>
        {prioritizedFeatures.length > 0 ? (
          <ul className="space-y-3 text-sm text-muted-foreground">
            {prioritizedFeatures.map((feature) => (
              <li
                key={feature.id}
                className="flex items-start gap-3 rounded-xl border border-[color:var(--brand-1)/0.12] bg-background/70 px-3 py-2"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-[color:var(--brand-1)/0.3] bg-[color:var(--brand-1)/0.1] text-[color:var(--brand-1)]">
                  <IconCheck className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="space-y-0.5 leading-tight">
                  <p className="font-medium text-foreground">{feature.name}</p>
                  {feature.description ? (
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-[color:var(--brand-1)/0.16] bg-background/60 px-3 py-3 text-sm text-muted-foreground">
            Reach out to our crew for the full subscription lineup.
          </p>
        )}
      </div>
      {includesOrganization ? (
        <div className="mt-auto pt-2">
          <Button asChild className="w-full">
            <Link href={MEMBER_ORGANIZATIONS_PATH}>Get started</Link>
          </Button>
        </div>
      ) : null}
    </article>
  )
}
