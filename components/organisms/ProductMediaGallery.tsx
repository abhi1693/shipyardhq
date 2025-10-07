import Image from "next/image"

import ImageLightbox from "@/components/molecules/ImageLightbox"
import { productPageCopy } from "@/lib/copy/productPage"

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
  const hasBanner = Boolean(bannerImage)
  const hasGallery = media.length > 0
  const hasMedia = hasBanner || hasGallery

  if (!hasMedia) {
    return null
  }

  const { media: mediaCopy } = productPageCopy

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--brand-1)]">
            {mediaCopy.eyebrow}
          </p>
          {hasGallery && media.length > 3 ? (
            <span className="text-sm text-muted-foreground">
              {mediaCopy.caption}
            </span>
          ) : null}
        </div>
        {hasGallery ? (
          <span className="rounded-full border border-border/60 bg-background/95 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground dark:border-slate-700/60 dark:bg-slate-950/70">
            {media.length} asset{media.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="space-y-4 rounded-3xl border border-border/70 bg-card p-4 shadow-sm shadow-black/5">
        {hasBanner ? (
          <ImageLightbox src={bannerImage!} alt={`${productName} banner`}>
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background">
              <div className="relative aspect-[3/1] w-full">
                <Image
                  src={bannerImage!}
                  alt={`${productName} banner`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1100px"
                  priority
                  quality={95}
                  className="object-cover"
                />
              </div>
            </div>
          </ImageLightbox>
        ) : null}

        {hasGallery ? (
          <div className="flex gap-4 overflow-x-auto pb-1">
            {media.map((item) => (
              <ImageLightbox
                key={item.id}
                src={item.imageUrl}
                alt={item.altText || productName}
              >
                <div className="relative h-40 w-64 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-background transition hover:border-[color:var(--brand-1)/0.4]">
                  <Image
                    src={item.imageUrl}
                    alt={item.altText || productName}
                    fill
                    sizes="256px"
                    quality={95}
                    className="object-cover"
                  />
                </div>
              </ImageLightbox>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
