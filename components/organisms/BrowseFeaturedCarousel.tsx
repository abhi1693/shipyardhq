"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { FeaturedProduct } from "@/types"
import { ProductCompactCard } from "@/components/molecules/ProductCompactCard"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"

interface BrowseFeaturedCarouselProps {
  products: FeaturedProduct[]
  className?: string
}

export function BrowseFeaturedCarousel({
  products,
  className,
}: BrowseFeaturedCarouselProps) {
  const items = useMemo(() => {
    return products
      .map((entry) => entry.product)
      .filter((product) => Boolean(product))
      .slice(0, 8)
  }, [products])

  const [index, setIndex] = useState(0)

  if (items.length === 0) {
    return null
  }

  const isSingle = items.length === 1

  const goTo = (direction: "prev" | "next") => {
    setIndex((prev) => {
      if (items.length === 0) return prev
      if (direction === "prev") {
        return (prev - 1 + items.length) % items.length
      }
      return (prev + 1) % items.length
    })
  }

  return (
    <div
      className={cn(
        "flex h-full w-full max-w-sm flex-col gap-4 rounded-xl border border-[color:var(--brand-1)/0.18] bg-card/90 p-4 shadow-[0px_30px_90px_-55px_rgba(7,58,104,0.78)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            Featured Spotlight
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Curated picks from the harbor
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => goTo("prev")}
            className="h-8 w-8"
            aria-label="Previous featured product"
            disabled={isSingle}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => goTo("next")}
            className="h-8 w-8"
            aria-label="Next featured product"
            disabled={isSingle}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={cn(
              "transition-all duration-200",
              i === index
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none absolute inset-0 opacity-0",
            )}
            aria-hidden={i !== index}
          >
            <ProductCompactCard
              product={{
                id: item.id,
                slug: item.slug,
                name: item.name,
                logo: item.logo,
                tagline: item.tagline,
              }}
              category={item.category?.name ?? null}
              upvotes={item.analytics?.upvotes ?? 0}
              imagePriority={i === index}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1" role="status" aria-live="polite">
        {items.map((item, i) => (
          <span
            key={`${item.id}-${i}`}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-[color:var(--brand-1)/0.18] transition-colors",
              i === index && "bg-[color:var(--brand-1)]",
            )}
            aria-hidden="true"
          />
        ))}
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          {index + 1} / {items.length}
        </span>
      </div>
    </div>
  )
}
