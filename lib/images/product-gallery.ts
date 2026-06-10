export const PRODUCT_GALLERY_MAIN_IMAGE_QUALITY = 85
export const PRODUCT_GALLERY_MAIN_IMAGE_SIZES =
  "(max-width: 640px) calc(50vw - 1rem), (max-width: 1023px) calc(100vw - 2rem), (max-width: 1279px) calc(66.67vw - 2.5rem), 768px"
export const PRODUCT_GALLERY_MAIN_IMAGE_WIDTHS = [
  320, 360, 384, 414, 512, 640, 768, 1024, 1280, 1536,
] as const
export const PRODUCT_GALLERY_MAIN_IMAGE_DEFAULT_WIDTH = 1280

export type DirectProductGalleryImage = {
  originalSrc: string
  src: string
  srcSet: string
  sizes: string
}
