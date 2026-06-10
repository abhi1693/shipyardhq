export const PRODUCT_GALLERY_MAIN_IMAGE_QUALITY = 85
export const PRODUCT_GALLERY_MAIN_IMAGE_SIZES =
  "(max-width: 768px) calc(100vw - 2rem), (max-width: 1280px) 68vw, 900px"
export const PRODUCT_GALLERY_MAIN_IMAGE_WIDTHS = [
  360, 414, 640, 768, 1024, 1280, 1536, 1920,
] as const
export const PRODUCT_GALLERY_MAIN_IMAGE_DEFAULT_WIDTH = 1280

export type DirectProductGalleryImage = {
  originalSrc: string
  src: string
  srcSet: string
  sizes: string
}
