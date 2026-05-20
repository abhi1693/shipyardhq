"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Image } from "@/components/atoms/image"
import { buildCloudflareMediaImageUrl } from "@/lib/images/cloudflare"
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

const THUMBNAIL_IMAGE_WIDTH = 320
const THUMBNAIL_IMAGE_QUALITY = 60

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

  const [selectedIndex, setSelectedIndex] = useState(0)
  const mediaCount = mediaItems.length
  const currentIndex =
    mediaCount === 0 ? 0 : selectedIndex >= mediaCount ? 0 : selectedIndex

  const hasMedia = mediaItems.length > 0

  if (!hasMedia) {
    return null
  }

  const currentItem = mediaItems[currentIndex]
  const totalAssets = mediaItems.length

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
    <section className="space-y-5">
      <div className="space-y-4 rounded-3xl border border-border bg-white p-4 shadow-sm">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
          <div className="relative aspect-[16/9] w-full">
            <Image
              key={currentItem.id}
              src={currentItem.imageUrl}
              alt={currentItem.altText || productName}
              fill
              sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1280px) 68vw, 900px"
              quality={85}
              className="object-contain transition-opacity duration-200"
              eager={currentIndex === 0}
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
        ) : null}
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
  item: MediaItem
  index: number
  isSelected: boolean
  productName: string
  onSelect: () => void
}) {
  const thumbnailSrc = buildCloudflareMediaImageUrl({
    src: item.imageUrl,
    width: THUMBNAIL_IMAGE_WIDTH,
    quality: THUMBNAIL_IMAGE_QUALITY,
  })
  const usesManagedThumbnail = thumbnailSrc !== item.imageUrl

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative h-20 w-full overflow-hidden rounded-2xl border border-border bg-muted transition hover:border-border/80",
        "sm:h-20 sm:w-32 sm:shrink-0",
        isSelected
          ? "border-border/60 bg-white outline outline-2 outline-offset-2 outline-foreground/10"
          : undefined,
      )}
      aria-label={`View image ${index + 1}`}
    >
      <Image
        src={thumbnailSrc}
        alt={item.altText || productName}
        fill
        sizes="160px"
        quality={THUMBNAIL_IMAGE_QUALITY}
        className="object-contain"
        loading="lazy"
        fetchPriority="low"
        placeholder="empty"
        unoptimized={usesManagedThumbnail}
      />
    </button>
  )
}
