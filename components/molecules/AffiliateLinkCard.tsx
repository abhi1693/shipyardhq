"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, Sparkles } from "lucide-react"

import { Image } from "@/components/atoms/image"
import {
  AFFILIATE_SIDEBAR_OFFERS,
  type AffiliateSidebarOffer,
} from "@/lib/marketing/affiliates"
import { cn } from "@/lib/utils"

const OFFERS = AFFILIATE_SIDEBAR_OFFERS
const FALLBACK_OFFER = OFFERS[0] ?? null

export function AffiliateLinkCard({ className }: { className?: string }) {
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(
    FALLBACK_OFFER?.id ?? null,
  )

  useEffect(() => {
    if (OFFERS.length <= 1) return

    const randomIndex = Math.floor(Math.random() * OFFERS.length)
    const nextId = OFFERS[randomIndex]?.id
    if (!nextId) return

    const timeoutId = window.setTimeout(() => {
      setSelectedOfferId(nextId)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [])

  const offer: AffiliateSidebarOffer | null =
    OFFERS.find((item) => item.id === selectedOfferId) ?? FALLBACK_OFFER
  if (!offer) return null

  const theme = offer.theme ?? "brand"
  const iconClassName =
    theme === "amber" ? "text-amber-600" : "text-[color:var(--brand-1)]"

  return (
    <a
      href={offer.href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={cn(
        "group block overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-white via-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        theme === "amber" ? "to-amber-50/60" : "to-[color:var(--brand-1)/0.08]",
        className,
      )}
      aria-label={`${offer.partnerName} (affiliate link)`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {offer.partnerName}
            </span>
          </div>

          <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground">
            {offer.title}
          </h3>
          <p className="text-sm text-muted-foreground">{offer.description}</p>
        </div>

        <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-white shadow-[0_18px_42px_-32px_rgba(7,68,134,0.35)] transition-transform duration-150 group-hover:scale-[1.03]">
          {offer.logoSrc ? (
            <Image
              src={offer.logoSrc}
              alt={offer.logoAlt ?? offer.partnerName}
              width={44}
              height={44}
              sizes="44px"
              className="h-full w-full object-cover"
            />
          ) : (
            <Sparkles className={cn("h-5 w-5", iconClassName)} aria-hidden />
          )}
        </span>
      </div>

      <div className="mt-4">
        <span
          className={cn(
            "inline-flex w-full items-center justify-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors duration-150",
            theme === "amber"
              ? "bg-amber-500 group-hover:bg-amber-500/90"
              : "bg-[color:var(--brand-1)] group-hover:bg-[color:var(--brand-1)]/90",
          )}
        >
          {offer.ctaLabel}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Affiliate link — Shipyard may earn a commission at no extra cost to you.
      </p>
    </a>
  )
}

export default AffiliateLinkCard
