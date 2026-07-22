"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { ResilientImage } from "@/components/atoms/resilient-image"
import {
  PRODUCT_GALLERY_MAIN_IMAGE_SIZES,
  type DirectProductGalleryImage,
} from "@/lib/images/product-gallery"
import { cn } from "@/lib/utils"

export interface ProductMediaGalleryItem {
  id: string
  imageUrl: string
  altText?: string | null
}

interface ProductMediaGalleryClientProps {
  bannerImage?: string | null
  directInitialImage?: DirectProductGalleryImage | null
  media: ProductMediaGalleryItem[]
  productName: string
}

const THUMBNAIL_IMAGE_QUALITY = 60

export function ProductMediaGalleryClient({
  bannerImage,
  directInitialImage,
  media,
  productName,
}: ProductMediaGalleryClientProps) {
  const mediaItems = useMemo(() => {
    const items: ProductMediaGalleryItem[] = []

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

  const [selectedIndex, setSelectedIndex] = useState(0)
  const mediaCount = mediaItems.length
  const currentIndex =
    mediaCount === 0 ? 0 : selectedIndex >= mediaCount ? 0 : selectedIndex

  if (!mediaItems.length) {
    return null
  }

  const currentItem = mediaItems[currentIndex]
  const totalAssets = mediaItems.length
  const shouldUseDirectInitialImage =
    currentIndex === 0 &&
    directInitialImage?.originalSrc === currentItem.imageUrl
  const mediaFallback = (
    <div className="absolute inset-0 flex items-center justify-center bg-[#eef2f7] px-6 text-center text-sm font-medium text-[#64748b]">
      Preview unavailable
    </div>
  )

  const goToPrevious = () => {
    setSelectedIndex((prev) =>
      mediaCount === 0 ? 0 : prev === 0 ? mediaCount - 1 : prev - 1,
    )
  }

  const goToNext = () => {
    setSelectedIndex((prev) =>
      mediaCount === 0 ? 0 : prev === mediaCount - 1 ? 0 : prev + 1,
    )
  }

  const mobileThumbnailGridClass =
    totalAssets >= 3
      ? "grid-cols-3"
      : totalAssets === 2
        ? "grid-cols-2"
        : "grid-cols-1"

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
        <div className="relative aspect-[16/9] w-full">
          {shouldUseDirectInitialImage ? (
            <ResilientImage
              key={currentItem.id}
              src={directInitialImage.src}
              sources={[
                {
                  srcSet: directInitialImage.srcSet,
                  sizes: directInitialImage.sizes,
                },
              ]}
              alt={currentItem.altText || productName}
              fill
              className="absolute inset-0 h-full w-full object-contain transition-opacity duration-200"
              eager
              loading="eager"
              fetchPriority="high"
              fallback={mediaFallback}
            />
          ) : (
            <ResilientImage
              key={currentItem.id}
              src={currentItem.imageUrl}
              alt={currentItem.altText || productName}
              fill
              sizes={PRODUCT_GALLERY_MAIN_IMAGE_SIZES}
              quality={85}
              className="object-contain transition-opacity duration-200"
              eager={currentIndex === 0}
              loading={currentIndex === 0 ? "eager" : "lazy"}
              preload={currentIndex === 0}
              fetchPriority={currentIndex === 0 ? "high" : "auto"}
              fallback={mediaFallback}
            />
          )}
        </div>
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Previous image"
          className="absolute left-4 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border border-border bg-white/95 p-3 text-foreground shadow-md transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Next image"
          className="absolute right-4 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border border-border bg-white/95 p-3 text-foreground shadow-md transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40"
        >
          <ChevronRight className="size-5" />
        </button>
        <span className="absolute bottom-4 right-4 rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          {currentIndex + 1} / {totalAssets}
        </span>
      </div>

      <div
        className={cn(
          "grid w-full gap-2 pb-1",
          mobileThumbnailGridClass,
          "sm:flex sm:flex-row sm:gap-3 sm:overflow-x-auto",
        )}
      >
        {mediaItems.map((item, index) => (
          <GalleryThumbnailButton
            key={item.id}
            item={item}
            index={index}
            isSelected={index === currentIndex}
            productName={productName}
            onSelect={() => setSelectedIndex(index)}
          />
        ))}
      </div>
    </section>
  )
}

function GalleryThumbnailButton({
  item,
  index,
  isSelected,
  productName,
  onSelect,
}: {
  item: ProductMediaGalleryItem
  index: number
  isSelected: boolean
  productName: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative h-20 w-full cursor-pointer overflow-hidden rounded-lg border border-border bg-muted transition hover:border-border/80",
        "sm:h-20 sm:w-32 sm:shrink-0",
        isSelected ? "border-2 border-[#0051d5] bg-white" : undefined,
      )}
      aria-label={`View image ${index + 1}`}
    >
      <ResilientImage
        src={item.imageUrl}
        alt={item.altText || productName}
        fill
        sizes="160px"
        quality={THUMBNAIL_IMAGE_QUALITY}
        className={cn("object-contain", isSelected && "opacity-60 grayscale")}
        loading="lazy"
        fetchPriority="low"
        placeholder="empty"
        fallback={
          <span className="flex h-full w-full items-center justify-center bg-[#eef2f7] px-2 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
            No preview
          </span>
        }
      />
    </button>
  )
}
