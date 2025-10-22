"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { productPageCopy } from "@/lib/copy/productPage"
import { cn } from "@/lib/utils"

interface MediaItem {
  id: string
  imageUrl: string
  altText?: string | null
}

interface ProductMediaGalleryProps {
  bannerImage?: string | null
  media: MediaItem[]
  productName: string
}

export function ProductMediaGallery({
  bannerImage,
  media,
  productName,
}: ProductMediaGalleryProps) {
  const mediaItems = useMemo(() => {
    const items: MediaItem[] = []

    if (bannerImage) {
      items.push({
        id: "banner",
        imageUrl: bannerImage,
        altText: `${productName} banner`,
      })
    }

    for (const item of media) {
      items.push({
        ...item,
        id: item.id,
      })
    }

    return items
  }, [bannerImage, media, productName])

  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (mediaItems.length === 0) return
    if (currentIndex >= mediaItems.length) {
      setCurrentIndex(0)
    }
  }, [currentIndex, mediaItems.length])

  const hasMedia = mediaItems.length > 0

  if (!hasMedia) {
    return null
  }

  const { media: mediaCopy } = productPageCopy
  const currentItem = mediaItems[currentIndex]
  const totalAssets = mediaItems.length

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1))
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {mediaCopy.eyebrow}
          </p>
          {totalAssets > 3 ? (
            <span className="text-sm text-muted-foreground">
              {mediaCopy.caption}
            </span>
          ) : null}
        </div>
        {totalAssets > 1 ? (
          <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {totalAssets} asset{totalAssets === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="space-y-4 rounded-3xl border border-border bg-white p-4 shadow-sm">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
          <div className="relative aspect-[16/9] w-full">
            <Image
              key={currentItem.id}
              src={currentItem.imageUrl}
              alt={currentItem.altText || productName}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1100px"
              quality={95}
              className="object-contain transition-opacity duration-200"
              preload={currentIndex === 0}
              loading={currentIndex === 0 ? "eager" : "lazy"}
              fetchPriority={currentIndex === 0 ? "high" : "auto"}
            />
          </div>
          {totalAssets > 1 ? (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white/95 p-3 text-foreground shadow-md transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                aria-label="Next image"
                className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white/95 p-3 text-foreground shadow-md transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40"
              >
                <ChevronRight className="size-5" />
              </button>
              <span className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                {currentIndex + 1} / {totalAssets}
              </span>
            </>
          ) : null}
        </div>

        {totalAssets > 1 ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {mediaItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl border bg-muted transition hover:border-border/80",
                  index === currentIndex
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border",
                )}
                aria-label={`View image ${index + 1}`}
              >
                <Image
                  src={item.imageUrl}
                  alt={item.altText || productName}
                  fill
                  sizes="128px"
                  quality={80}
                  className="object-contain"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
