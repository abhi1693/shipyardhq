import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import Image from "next/image"
import { Badge } from "@/components/atoms/badge"
import { FeaturedProduct } from "@/types"
import { badgeColorMap } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/atoms/avatar"
import { BADGE_OPTIONS } from "@/lib/constants"
import { ArrowUp } from "lucide-react"
import clsx from "clsx"

export default function FeaturedProductCard({
  product,
}: {
  product: FeaturedProduct
}) {
  const p = product.product
  const upvotes = p.analytics?.upvotes ?? 0
  const createdBy =
    `${p.user?.firstName ?? ""} ${p.user?.lastName ?? ""}`.trim()
  const now = new Date()

  return (
    <Link
      href={`/products/${p.id}`}
      className="block animate-fade-in"
      style={{ animationDuration: "500ms" }}
    >
      <Card className="bg-white text-foreground rounded-xl shadow-md hover:shadow-xl transition-all border border-muted hover:border-primary">
        <CardHeader>
          <div className="flex items-start gap-4">
            <Image
              src={p.logo}
              alt={p.name}
              width={56}
              height={56}
              className="rounded-md object-cover border"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold leading-tight">
                  {p.name}
                </CardTitle>
                {p.category?.name && (
                  <span className="ml-2 text-xs font-medium rounded-full bg-muted px-2 py-0.5 text-muted-foreground border border-border">
                    {p.category.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {p.tagline}
              </p>
              {p.ProductBadge.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pb-1">
                  {p.ProductBadge.map((pb) => {
                    const badgeDef = BADGE_OPTIONS.find(
                      (b) => b.value === pb.badge,
                    )
                    if (!badgeDef) return null
                    const isActive =
                      !pb.expiresAt || new Date(pb.expiresAt) > now
                    const pulse = ["featured", "trending"].includes(
                      badgeDef.value,
                    )
                    const colorClass = badgeColorMap[badgeDef.color]

                    return (
                      <Badge
                        key={pb.id}
                        className={clsx(
                          "text-xs rounded-full px-2 py-0.5 border transition-all",
                          colorClass,
                          pulse &&
                            isActive &&
                            "animate-pulse-slow border-2 font-medium",
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
              <span className="text-foreground font-semibold">
                {upvotes}
              </span>
            </div>

            {p.user && (
              <div className="flex items-center gap-2 group">
                <Avatar className="h-5 w-5 border">
                  <AvatarFallback>
                    {p.user.firstName?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="group-hover:underline">{createdBy}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
