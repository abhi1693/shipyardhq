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
import {BADGE_OPTIONS} from "@/lib/constants";
import {ArrowUpRight} from "lucide-react";

export default function FeaturedProductCard({
  product,
}: {
  product: FeaturedProduct
}) {
  const p = product.product
  const upvotes = p.analytics?.upvotes ?? 0
  const createdBy = `${p.user?.firstName ?? ""} ${p.user?.lastName ?? ""}`.trim()

  return (
    <Link href={`/products/${p.id}`} className="block">
      <Card className="bg-white text-foreground rounded-xl shadow-md hover:shadow-lg transition-shadow border border-muted overflow-hidden">
        <CardHeader className="relative">
          {p.category?.name && (
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center rounded-full border border-muted px-2 py-0.5 text-xs text-muted-foreground font-medium">
                {p.category.name}
              </span>
            </div>
          )}
          <div className="flex items-start gap-4">
            <Image
              src={p.logo}
              alt={p.name}
              width={56}
              height={56}
              className="rounded-md object-cover border"
            />
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold leading-tight">
                {p.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {p.tagline}
              </p>
              {p.ProductBadge.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.ProductBadge.map((pb) => {
                    const badgeDef = BADGE_OPTIONS.find((b) => b.value === pb.badge)
                    if (!badgeDef) return null
                    const colorClass = badgeColorMap[badgeDef.color]

                    return (
                      <Badge
                        key={pb.id}
                        className={`text-xs rounded-full px-2 py-0.5 border ${colorClass}`}
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
            <div className="inline-flex items-center gap-2 rounded-md border px-3 py-1 bg-muted">
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{upvotes}</span>
              <span className="text-muted-foreground">Upvotes</span>
            </div>
            {p.user && (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5 border">
                  <AvatarFallback>
                    {p.user.firstName?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span>{createdBy}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
