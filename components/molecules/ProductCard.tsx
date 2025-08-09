import Link from "next/link"
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
}

export function ProductCard({
  product,
  badges = [],
  upvotes = 0,
  author,
  category,
  compact = false,
  topRight,
}: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="block h-full transition-transform duration-300 hover:-translate-y-1"
    >
      <Card
        className={clsx(
          "relative h-full bg-background text-foreground border border-muted rounded-xl shadow-sm hover:shadow-md transition-all",
          compact && "p-3",
        )}
      >
        {topRight && (
          <div className="absolute top-2 right-2 z-10">{topRight}</div>
        )}
        <CardHeader className={clsx("pb-3", compact && "p-0")}> 
          <div className="flex gap-3 items-start">
            <div
              className={clsx(
                "flex-shrink-0 rounded-md border bg-muted overflow-hidden",
                compact ? "w-10 h-10" : "w-14 h-14",
              )}
            >
              <Image
                src={product.logo}
                alt={product.name}
                width={compact ? 40 : 56}
                height={compact ? 40 : 56}
                className="object-cover w-full h-full"
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
                  "text-muted-foreground line-clamp-2",
                  compact ? "text-xs" : "text-sm",
                )}
              >
                {product.tagline}
              </p>

              {!compact && badges.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {badges.map((b, i) => {
                    const badgeDef = BADGE_OPTIONS.find((x) => x.value === b)
                    if (!badgeDef) return null

                    const colorClass =
                      badgeColorMap[badgeDef.color as TailwindColor]

                    return (
                      <Badge
                        key={i}
                        className={clsx(
                          "text-xs rounded-full px-2 py-0.5 border",
                          colorClass,
                        )}
                      >
                        {badgeDef.icon} {badgeDef.label}
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className={clsx("pt-1 px-4", compact && "pt-1 px-4")}> 
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
    </Link>
  )
}
