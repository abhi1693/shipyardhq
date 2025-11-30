import Link from "next/link"

import { SquareImage } from "@/components/molecules/SquareImage"
import { BadgeCheck, Banknote } from "lucide-react"
import { cn } from "@/lib/utils"
import { userPath } from "@/lib/routes"

type MakerCardVariant = "default" | "sponsored"

const LOGO_SIZE = 60

const CARD_VARIANT_CLASSES: Record<MakerCardVariant, string> = {
  default:
    "border-2 border-border/70 bg-card shadow-[4px_12px_28px_-20px_rgba(7,68,134,0.26)] hover:shadow-[14px_30px_60px_-34px_rgba(7,68,134,0.45)]",
  sponsored:
    "border-2 border-[#F59E0B]/45 bg-[#FFF7ED] shadow-[4px_12px_28px_-20px_rgba(226,120,34,0.26)] hover:shadow-[14px_30px_60px_-34px_rgba(226,120,34,0.45)]",
}

export type MakerFeedItem = {
  id: string
  name: string
  launches: number
  avatarUrl?: string | null
  initials: string
  rank?: number
  variant?: MakerCardVariant
  latestRevenueCents?: number | null
  revenueCurrencyCode?: string | null
  isVerified?: boolean
}

interface MakerFeedCardProps {
  item: MakerFeedItem
  className?: string
}

export function MakerFeedCard({ item, className }: MakerFeedCardProps) {
  const variant = item.variant ?? "default"
  const launchesLabel = `${item.launches.toLocaleString()} launch${
    item.launches === 1 ? "" : "es"
  }`
  const revenueCents =
    typeof item.latestRevenueCents === "number" ? item.latestRevenueCents : null
  const hasRevenue = revenueCents !== null && revenueCents > 0
  const revenueLabel = hasRevenue
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: item.revenueCurrencyCode ?? "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(revenueCents / 100)
    : null

  const cardClasses = cn(
    "group relative flex h-full flex-col rounded-2xl p-5 text-left transition-shadow duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.18]",
    CARD_VARIANT_CLASSES[variant],
    className,
  )

  return (
    <Link href={userPath(item.id)} className={cardClasses}>
      <article className="flex flex-1 flex-col gap-4">
        <div className="flex w-full flex-wrap items-start gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted/40">
            {item.avatarUrl ? (
              <SquareImage
                src={item.avatarUrl}
                alt={`${item.name} avatar`}
                size={LOGO_SIZE}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-foreground">
                {item.initials}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="line-clamp-1 text-base font-semibold text-foreground">
                {item.name}
              </h2>
              {item.rank ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.08] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--brand-1)]">
                  #{item.rank}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{launchesLabel}</p>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {item.isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Verified</span>
            </span>
          ) : null}
          {revenueLabel ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-900 shadow-sm"
              title="Verified revenue"
            >
              <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="whitespace-nowrap">{revenueLabel}</span>
            </span>
          ) : null}
        </div>
      </article>
    </Link>
  )
}

export default MakerFeedCard
