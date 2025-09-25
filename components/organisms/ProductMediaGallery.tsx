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
    <section className="space-y-6 -mt-8 sm:-mt-10 lg:-mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
            {mediaCopy.eyebrow}
          </p>
          {hasGallery && media.length > 3 ? (
            <span className="text-sm text-slate-600 dark:text-slate-200/90">
              {mediaCopy.caption}
            </span>
          ) : null}
        </div>
      </div>

      {hasBanner ? (
        <ImageLightbox src={bannerImage!} alt={`${productName} banner`}>
          <div className="relative overflow-hidden rounded-[28px] ring-1 ring-slate-200/45 shadow-[0_32px_90px_-60px_rgba(7,58,104,0.45)] backdrop-blur-sm dark:ring-slate-700/40">
            <div className="relative aspect-[3/1] w-full">
              <Image
                src={bannerImage!}
                alt={`${productName} banner`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1100px"
                priority
                quality={95}
                className="object-contain object-center"
              />
            </div>
          </div>
        </ImageLightbox>
      ) : null}

      {hasGallery ? (
        <div className="not-prose flex gap-4 overflow-x-auto pb-1">
          {media.map((item) => (
            <ImageLightbox
              key={item.id}
              src={item.imageUrl}
              alt={item.altText || productName}
            >
              <div className="relative h-40 w-64 shrink-0 overflow-hidden rounded-3xl ring-1 ring-slate-200/40 transition hover:ring-[color:var(--brand-1)/0.35] dark:ring-slate-700/40">
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
    </section>
  )
}
