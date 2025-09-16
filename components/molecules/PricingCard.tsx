"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import clsx from "clsx"
import { IconFlame } from "@tabler/icons-react"
import { PricingFeature } from "@/components/molecules/PricingFeature"

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
}

export function PricingCard({
  name,
  description,
  price,
  priceSuffix,
  discount,
  isPopular,
  features,
  ctaHref = "/member/overview",
  ctaLabel = "Choose Plan",
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
  const displayPrice = isFree
    ? "Free"
    : currency.format(discountedCents / 100)
  const formattedDiscount = hasDiscount
    ? new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }).format(pct)
    : null

  return (
    <Card className={clsx("h-full min-h-[22rem] flex flex-col")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold truncate">
            {name}
          </CardTitle>
          {isPopular && !isFree && (
            <Badge className="bg-orange-100 text-orange-800 border-orange-300">
              <IconFlame className="h-3.5 w-3.5 mr-1" /> Popular
            </Badge>
          )}
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            {hasDiscount && originalPrice ? (
              <span className="text-sm text-muted-foreground line-through">
                {originalPrice}
              </span>
            ) : null}
            <span className="text-4xl font-extrabold tracking-tight">
              {displayPrice}
            </span>
            {!isFree && priceSuffix ? (
              <span className="text-sm text-foreground/80">{priceSuffix}</span>
            ) : null}
          </div>
          {hasDiscount && formattedDiscount ? (
            <span className="text-xs inline-flex w-fit items-center rounded bg-green-100 text-green-800 border border-green-300 px-2 py-0.5">
              Save {formattedDiscount}%
            </span>
          ) : null}
        </div>
        {description && (
          <p className="text-base text-foreground/90 leading-snug">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ul className="space-y-2 mb-4">
          {features
            .filter((f) => f.enabled)
            .map((f) => (
              <PricingFeature key={f.id} label={f.name} enabled={true} />
            ))}
        </ul>
        <div className="mt-auto">
          <Button asChild className="w-full">
            <a href={ctaHref}>{ctaLabel}</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
