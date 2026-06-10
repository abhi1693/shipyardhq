import { Image } from "@/components/atoms/image"
import {
  ProductMediaGalleryClient,
  type ProductMediaGalleryItem,
} from "@/components/organisms/ProductMediaGalleryClient"
import {
  PRODUCT_GALLERY_MAIN_IMAGE_SIZES,
  type DirectProductGalleryImage,
} from "@/lib/images/product-gallery"

interface ProductMediaGalleryProps {
  bannerImage?: string | null
  directInitialImage?: DirectProductGalleryImage | null
  media: ProductMediaGalleryItem[]
  productName: string
}

function buildMediaItems({
  bannerImage,
  media,
  productName,
}: Pick<ProductMediaGalleryProps, "bannerImage" | "media" | "productName">) {
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
}

export function ProductMediaGallery({
  bannerImage,
  directInitialImage,
  media,
  productName,
}: ProductMediaGalleryProps) {
  const mediaItems = buildMediaItems({ bannerImage, media, productName })
  const currentItem = mediaItems[0]

  if (!currentItem) return null

  if (mediaItems.length > 1) {
    return (
      <ProductMediaGalleryClient
        bannerImage={bannerImage}
        directInitialImage={directInitialImage}
        media={media}
        productName={productName}
      />
    )
  }

  const shouldUseDirectInitialImage =
    directInitialImage?.originalSrc === currentItem.imageUrl

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
        <div className="relative aspect-[16/9] w-full">
          {shouldUseDirectInitialImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={directInitialImage.src}
              srcSet={directInitialImage.srcSet}
              sizes={directInitialImage.sizes}
              alt={currentItem.altText || productName}
              className="absolute inset-0 h-full w-full object-contain transition-opacity duration-200"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          ) : (
            <Image
              src={currentItem.imageUrl}
              alt={currentItem.altText || productName}
              fill
              sizes={PRODUCT_GALLERY_MAIN_IMAGE_SIZES}
              quality={85}
              className="object-contain transition-opacity duration-200"
              eager
              loading="eager"
              preload
              fetchPriority="high"
            />
          )}
        </div>
      </div>
    </section>
  )
}
