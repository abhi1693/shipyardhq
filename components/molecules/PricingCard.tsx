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
  isPopular,
  features,
  ctaHref = "/member/overview",
  ctaLabel = "Choose Plan",
}: PricingCardProps) {
  const isFree = price === 0
  const priceText = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price / 100)
  const priceMain = isFree ? (
    <span className="text-4xl font-extrabold tracking-tight">Free</span>
  ) : (
    <span className="text-4xl font-extrabold tracking-tight">{priceText}</span>
  )
  const priceSub =
    !isFree && priceSuffix ? (
      <span className="text-sm text-foreground/80">{priceSuffix}</span>
    ) : null

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
        <div className="mt-2 flex flex-col">
          {priceMain}
          {priceSub}
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
