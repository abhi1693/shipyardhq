"use client"

import { useEffect, useMemo, useState } from "react"
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
  const items = useMemo(
    () =>
      products
        .map((entry) => entry.product)
        .filter(
          (product): product is NonNullable<typeof product> => Boolean(product),
        ),
    [products],
  )

  const total = items.length
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    setIndex(0)
  }, [total])

  useEffect(() => {
    if (total <= 1 || isPaused) return

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % total)
    }, 5000)

    return () => clearInterval(timer)
  }, [total, isPaused])

  if (total === 0) {
    return null
  }

  const goTo = (direction: "prev" | "next") => {
    if (total <= 1) return
    setIndex((prev) => {
      if (direction === "prev") {
        return (prev - 1 + total) % total
      }
      return (prev + 1) % total
    })
  }

  const onPause = (next: boolean) => {
    if (total <= 1) return
    setIsPaused(next)
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm shadow-black/5",
        className,
      )}
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
      onFocusCapture={() => onPause(true)}
      onBlurCapture={() => onPause(false)}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
        Featured spotlight
      </p>

      <div
        className="relative h-[150px] overflow-hidden"
        aria-live="polite"
        aria-atomic="true"
      >
        {items.map((item, itemIndex) => (
          <div
            key={item.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              "rounded-2xl",
              itemIndex === index
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0",
            )}
            aria-hidden={itemIndex !== index}
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
              imagePriority={itemIndex === index}
              className="h-full"
            />
          </div>
        ))}
      </div>

      {total > 1 ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {items.map((item, dotIndex) => (
              <button
                key={`${item.id}-dot`}
                type="button"
                className={cn(
                  "h-1.5 w-6 rounded-full bg-border transition-colors",
                  dotIndex === index && "bg-[color:var(--brand-1)]",
                )}
                onClick={() => setIndex(dotIndex)}
                aria-label={`Show featured product ${dotIndex + 1} of ${total}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goTo("prev")}
              aria-label="Previous featured product"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goTo("next")}
              aria-label="Next featured product"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs font-medium text-muted-foreground">
          Spotlight secured: only one launch featured right now.
        </p>
      )}
    </div>
  )
}
