import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import Image from "next/image"
import { Badge } from "@/components/atoms/badge"
import { Avatar, AvatarFallback } from "@/components/atoms/avatar"
import { ArrowUp } from "lucide-react"
import { badgeColorMap, TailwindColor } from "@/lib/utils"
import { BADGE_OPTIONS } from "@/lib/constants"
import clsx from "clsx"

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
}

export function ProductCard({
  product,
  badges = [],
  upvotes = 0,
  author,
  category,
}: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="block animate-fade-in"
      style={{ animationDuration: "500ms" }}
    >
      <Card className="bg-white text-foreground rounded-xl shadow-md hover:shadow-xl transition-all border border-muted hover:border-primary">
        <CardHeader>
          <div className="flex items-start gap-4">
            <Image
              src={product.logo}
              alt={product.name}
              width={56}
              height={56}
              className="rounded-md object-cover border"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold leading-tight">
                  {product.name}
                </CardTitle>
                {category && (
                  <span className="ml-2 text-xs font-medium rounded-full bg-muted px-2 py-0.5 text-muted-foreground border border-border">
                    {category}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {product.tagline}
              </p>
              {badges.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pb-1">
                  {badges.map((b, i) => {
                    const badgeDef = BADGE_OPTIONS.find((x) => x.value === b)
                    if (!badgeDef) return null
                    const colorClass =
                      badgeColorMap[badgeDef.color as TailwindColor]

                    return (
                      <Badge
                        key={i}
                        className={clsx(
                          "text-xs rounded-full px-2 py-0.5 border transition-all",
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

        <CardContent className="pt-0 text-sm">
          <div className="flex justify-between items-end mt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 px-2 py-1 bg-muted border rounded-md text-xs font-medium text-foreground">
              <ArrowUp className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground">Upvote</span>
              <span className="text-foreground font-semibold">{upvotes}</span>
            </div>
            {author && (
              <div className="flex items-center gap-2 group">
                <Avatar className="h-5 w-5 border">
                  <AvatarFallback>{author.initial}</AvatarFallback>
                </Avatar>
                <span className="group-hover:underline">{author.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
