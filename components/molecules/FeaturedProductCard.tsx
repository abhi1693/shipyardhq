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
import { ArrowUpRight } from "lucide-react"
import { BADGE_OPTIONS } from "@/lib/constants"

export default function FeaturedProductCard({
  product,
}: {
  product: FeaturedProduct
}) {
  const p = product.product
  const category = p.category?.name || "Uncategorized"
  const upvotes = p.analytics?.upvotes ?? 0
  const createdBy =
    `${p.user?.firstName ?? ""} ${p.user?.lastName ?? ""}`.trim()

  const activeBadges = p.ProductBadge.map((pb) => {
    return BADGE_OPTIONS.find((b) => b.value === pb.badge)
  }).filter(Boolean)

  return (
    <Card className="transition-shadow hover:shadow-lg border border-yellow-300 bg-yellow-50">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Image
            src={p.logo}
            alt={p.name}
            width={56}
            height={56}
            className="rounded-lg object-cover border"
          />
          <div className="flex-1">
            <CardTitle className="text-base font-semibold leading-tight">
              {p.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {p.tagline}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {activeBadges.map((badge) => (
                <Badge
                  key={badge?.value}
                  className={`text-xs rounded-full bg-${badge?.color}-100 text-${badge?.color}-800 border border-${badge?.color}-300`}
                >
                  {badge?.icon} {badge?.label}
                </Badge>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>📂 {category}</span>
              <span>⬆️ {upvotes} upvotes</span>
              {createdBy && <span>👤 {createdBy}</span>}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Link
          href={`/products/${p.id}`}
          className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          View product <ArrowUpRight className="w-4 h-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
