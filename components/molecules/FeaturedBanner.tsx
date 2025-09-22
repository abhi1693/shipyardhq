import Link from "next/link"
import Image from "next/image"
import { FeaturedProduct } from "@/types"
import { cn } from "@/lib/utils"
import { productPath } from "@/lib/routes"

export default function FeaturedBanner({
  item,
  className,
}: {
  item: FeaturedProduct
  className?: string
}) {
  const p = item.product
  return (
    <Link
      href={productPath(p.slug)}
      className={cn(
        "relative block overflow-hidden rounded-xl border bg-background",
        className,
      )}
    >
      <div className="relative w-full aspect-[3/1] bg-muted">
        {p.bannerImage ? (
          <Image
            src={p.bannerImage}
            alt={p.name}
            fill
            className="object-cover"
            sizes="100vw"
            quality={95}
            priority
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            {p.name}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />
        <div className="absolute left-4 bottom-4 text-white">
          <div className="text-xs uppercase tracking-wide opacity-90">
            Featured
          </div>
          <div className="text-xl font-semibold leading-tight">{p.name}</div>
          <div className="text-sm opacity-90 line-clamp-1">{p.tagline}</div>
        </div>
      </div>
    </Link>
  )
}
