"use client"

import type { ReactNode } from "react"
import { Check, Zap } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import clsx from "clsx"
import { IconAnchor, IconArrowUpRight, IconBolt } from "@tabler/icons-react"
import { PricingFeature } from "@/components/molecules/PricingFeature"
import { MEMBER_PRODUCTS_ADD_PATH } from "@/lib/routes"

export type PricingCardProps = {
  name: string
  description?: string | null
  price: number
  priceSuffix?: string
  discount?: number | null
  isPopular?: boolean
  features: {
    id: string
    name: string
    key: string
    description: string
    enabled: boolean
    isExperimental: boolean
  }[]
  ctaHref?: string
  ctaLabel?: string
  boostForDays?: number | null
  ctaSlot?: ReactNode
  variant?: "default" | "placement"
}

export function PricingCard({
  name,
  description,
  price,
  priceSuffix,
  discount,
  isPopular,
  features,
  boostForDays,
  ctaHref = MEMBER_PRODUCTS_ADD_PATH,
  ctaLabel = "Get Started",
  ctaSlot,
  variant = "default",
}: PricingCardProps) {
  const isFree = price === 0
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  })
  const pctRaw = discount ?? 0
  const pct = Math.min(Math.max(pctRaw, 0), 100)
  const hasDiscount = !isFree && pct > 0 && pct < 100
  const discountedCents = hasDiscount
    ? Math.round(price * (1 - pct / 100))
    : price
  const originalPrice = !isFree ? currency.format(price / 100) : null
  const displayPrice = isFree ? "Free" : currency.format(discountedCents / 100)
  const formattedDiscount = hasDiscount
    ? new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }).format(pct)
    : null
  const boostDuration =
    typeof boostForDays === "number" && boostForDays > 0
      ? Math.round(boostForDays)
      : null
  const boostLabel =
    boostDuration && boostDuration > 0
      ? `Boosts your launch for ${boostDuration} day${
          boostDuration === 1 ? "" : "s"
        }`
      : null

  if (variant === "placement") {
    const isPro = /pro/i.test(name)
    const accentClassName = isPopular
      ? "text-[#16a34a]"
      : isPro
        ? "text-black"
        : "text-[#0051d5]"
    const checkClassName = isPopular
      ? "text-[#16a34a]"
      : isPro
        ? "text-black"
        : "text-[#0051d5]"

    return (
      <Card
        className={clsx(
          "relative flex h-full min-h-[34rem] flex-col overflow-visible rounded-2xl border bg-white/80 p-0 shadow-none backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]",
          isPopular
            ? "z-10 border-2 border-[#16a34a] bg-white shadow-xl md:scale-[1.03]"
            : "border-[#E2E8F0]",
        )}
      >
        {isPopular && !isFree ? (
          <div className="absolute -top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#16a34a] px-4 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-lg">
            <IconAnchor className="size-3.5" aria-hidden />
            Most Popular
          </div>
        ) : null}

        <CardHeader className="space-y-6 p-8 pb-0">
          <div>
            <CardTitle className="text-lg font-semibold leading-6 text-black">
              {name}
            </CardTitle>
            {description ? (
              <p className="mt-1 text-[11px] font-medium leading-[14px] text-[#43474c]">
                {description}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-1">
              {hasDiscount && originalPrice ? (
                <span className="text-sm text-[#74777d] line-through">
                  {originalPrice}
                </span>
              ) : null}
              <span
                className={clsx(
                  "text-[32px] font-bold leading-10",
                  accentClassName,
                )}
              >
                {displayPrice}
              </span>
              {!isFree && priceSuffix ? (
                <span className="text-[11px] font-medium leading-[14px] text-[#43474c]">
                  {priceSuffix}
                </span>
              ) : null}
            </div>
            {hasDiscount && formattedDiscount ? (
              <span className="inline-flex w-fit items-center rounded-full border border-[#16a34a]/25 bg-[#16a34a]/10 px-2 py-0.5 text-xs font-semibold text-[#16a34a]">
                Save {formattedDiscount}%
              </span>
            ) : null}
            {isFree ? (
              <span className="inline-flex w-fit items-center rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#0051d5]">
                Starter
              </span>
            ) : null}
            {boostLabel ? (
              <div
                className={clsx(
                  "flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em]",
                  accentClassName,
                )}
              >
                <Zap className="size-4" aria-hidden />
                <span>{boostLabel}</span>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col p-8 pt-6">
          <ul className="flex-1 space-y-4 border-t border-[#E2E8F0] pt-6">
            {features
              .filter((feature) => feature.enabled)
              .map((feature) => (
                <li
                  key={feature.id}
                  className="flex items-start gap-3 text-sm leading-5 text-[#0b1c30]"
                  title={feature.description || undefined}
                >
                  <Check
                    className={clsx("mt-0.5 size-4 shrink-0", checkClassName)}
                    aria-hidden
                  />
                  <span
                    className={clsx(
                      feature.key.includes("advanced") ||
                        feature.key.includes("sticky") ||
                        feature.key.includes("priority")
                        ? "font-semibold"
                        : "font-medium",
                    )}
                  >
                    {feature.name}
                  </span>
                </li>
              ))}
          </ul>

          <div className="mt-8">
            {ctaSlot ?? (
              <Button
                asChild
                className={clsx(
                  "h-auto w-full rounded-lg py-3 text-sm font-semibold shadow-none active:scale-[0.98]",
                  isPopular
                    ? "border-0 bg-black text-white hover:bg-black/90"
                    : isPro
                      ? "border border-black bg-white text-black hover:bg-black hover:text-white"
                      : "border-0 bg-[#346cef] text-white hover:bg-[#0051d5]",
                )}
              >
                <a href={ctaHref}>
                  {isFree ? "Start for free" : ctaLabel}
                  {!isFree && (
                    <IconArrowUpRight className="size-4 transition-transform group-hover:translate-x-1" />
                  )}
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={clsx(
        "flex h-full min-h-[34rem] flex-col overflow-hidden rounded-2xl border-none bg-white shadow-[0px_22px_55px_-38px_rgba(15,23,42,0.45)] transition-transform duration-200 ease-out",
        isPopular && "shadow-[0px_28px_70px_-34px_rgba(15,23,42,0.48)]",
      )}
    >
      <CardHeader className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold leading-tight text-foreground">
              {name}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground leading-snug">
                {description}
              </p>
            )}
          </div>
          {isPopular && !isFree ? (
            <Badge className="inline-flex items-center gap-1 rounded-full border-[color:var(--brand-2)/0.3] bg-[color:var(--brand-2)/0.15] text-[color:var(--brand-2-text,#0a5678)]">
              <IconAnchor className="h-3.5 w-3.5" /> Most popular
            </Badge>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-2 text-[color:var(--brand-1)]">
            {hasDiscount && originalPrice ? (
              <span className="text-sm text-foreground/60 line-through">
                {originalPrice}
              </span>
            ) : null}
            <span className="text-4xl font-bold tracking-tight">
              {displayPrice}
            </span>
            {!isFree && priceSuffix ? (
              <span className="text-sm text-foreground/80">{priceSuffix}</span>
            ) : null}
          </div>
          {hasDiscount && formattedDiscount ? (
            <span className="inline-flex w-fit items-center rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              Save {formattedDiscount}%
            </span>
          ) : null}
          {isFree && (
            <span className="inline-flex w-fit items-center rounded-full bg-[color:var(--brand-1)/0.12] px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
              Starter
            </span>
          )}
          {boostLabel ? (
            <div className="flex items-center gap-2 rounded-xl bg-[color:var(--brand-1)/0.06] px-3 py-2 text-sm font-medium text-[color:var(--brand-1)]">
              <IconBolt aria-hidden className="h-4 w-4" />
              <span className="leading-tight">{boostLabel}</span>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="flex-1">
          <ul className="space-y-3">
            {features
              .filter((f) => f.enabled)
              .map((f) => (
                <PricingFeature
                  key={f.id}
                  label={f.name}
                  enabled={true}
                  isExperimental={f.isExperimental}
                  description={f.description}
                />
              ))}
          </ul>
        </div>

        <div className="mt-8">
          {ctaSlot ?? (
            <Button
              asChild
              className={clsx(
                "group w-full justify-center gap-2 transition",
                isFree
                  ? "border-[color:var(--brand-1)/0.4] bg-[color:var(--brand-1)] text-white shadow-[0px_20px_55px_-32px_rgba(7,58,104,0.65)] hover:border-[color:var(--brand-1)/0.55] hover:bg-[color:var(--brand-1)/0.92] hover:shadow-[0px_26px_70px_-34px_rgba(7,78,134,0.7)] focus-visible:border-[color:var(--brand-2)/0.6] focus-visible:ring-[color:var(--brand-2)/0.35]"
                  : "shadow-[0px_22px_55px_-32px_rgba(7,58,104,0.65)] hover:shadow-[0px_30px_70px_-38px_rgba(7,78,134,0.7)]",
              )}
            >
              <a href={ctaHref}>
                {isFree ? "Start for free" : ctaLabel}
                {!isFree && (
                  <IconArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                )}
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
