import { clickProductCardAction } from "@/actions/public/products/analytics"
import Image from "next/image"
import clsx from "clsx"

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/atoms/card"
import { UpvoteSquare } from "@/components/molecules/UpvoteSquare"
import { ProductAuthor } from "@/components/molecules/ProductAuthor"
import { Badge } from "@/components/atoms/badge"
import { badgeColorMap, TailwindColor } from "@/lib/utils"
import { BADGE_OPTIONS } from "@/lib/constants"

interface ProductCardProps {
  product: {
    id: string
    slug: string
    name: string
    logo: string
    tagline: string
  }
  badges?: string[]
  upvotes?: number
  author?: {
    name: string
    initial: string
  }
  category?: string
  compact?: boolean
  topRight?: React.ReactNode
  imagePriority?: boolean
}

export function ProductCard({
  product,
  badges = [],
  upvotes = 0,
  author,
  category,
  compact = false,
  topRight,
  imagePriority = false,
}: ProductCardProps) {
  return (
    <form action={clickProductCardAction} method="post" className="h-full">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="productSlug" value={product.slug} />
      <button
        type="submit"
        className="block h-full w-full text-left transition-transform duration-300 hover:-translate-y-1"
      >
        <Card
          className={clsx(
            "relative h-full bg-background text-foreground border border-muted rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer",
            compact ? "p-3 gap-2" : undefined,
          )}
        >
          {topRight && (
            <div className="absolute top-2 right-2 z-10">{topRight}</div>
          )}
          <CardHeader className={clsx(compact ? "p-0 pb-2" : "pb-3")}>
            <div className={clsx("flex items-start", compact ? "gap-2" : "gap-3")}>
              <div
                className={clsx(
                  "flex-shrink-0 rounded-md border bg-muted overflow-hidden",
                  compact ? "w-8 h-8" : "w-14 h-14",
                )}
              >
                <Image
                  src={product.logo}
                  alt={product.name}
                  width={compact ? 32 : 56}
                  height={compact ? 32 : 56}
                  className="object-cover w-full h-full"
                  loading={imagePriority ? "eager" : "lazy"}
                  priority={imagePriority}
                />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className={clsx(
                      "font-semibold leading-snug",
                      compact ? "text-sm" : "text-base",
                    )}
                  >
                    {product.name}
                  </CardTitle>
                  {category && !compact && (
                    <span className="ml-2 text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full border">
                      {category}
                    </span>
                  )}
                </div>

                <p
                  className={clsx(
                    "text-muted-foreground",
                    compact ? "text-xs line-clamp-1" : "text-sm line-clamp-2",
                  )}
                >
                  {product.tagline}
                </p>

                {compact ? null : (
                  badges.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {badges.map((b, i) => {
                        const badgeDef = BADGE_OPTIONS.find(
                          (x) => x.value === b,
                        )
                        if (!badgeDef) return null

                        const colorClass =
                          badgeColorMap[badgeDef.color as TailwindColor]

                        return (
                          <Badge
                            key={i}
                            className={clsx(
                              "rounded-full border px-2 py-0.5 text-xs",
                              colorClass,
                            )}
                          >
                            {badgeDef.icon}
                            <span className="ml-1">{badgeDef.label}</span>
                          </Badge>
                        )
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className={clsx("pt-1 px-4", compact && "pt-0 px-3")}>
            <div className="flex items-center justify-between">
              <UpvoteSquare
                count={upvotes}
                compact={compact}
                className={compact ? "-ml-4" : "ml-2"}
              />

              {author && (
                <ProductAuthor
                  name={author.name}
                  initial={author.initial}
                  compact={compact}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </button>
    </form>
  )
}
