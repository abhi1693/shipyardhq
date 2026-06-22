export const PRODUCT_GALLERY_MAIN_IMAGE_QUALITY = 85
export const PRODUCT_GALLERY_MAIN_IMAGE_SIZES =
  "(max-width: 767px) calc(100vw - 2rem), (max-width: 1023px) calc(100vw - 3rem), (max-width: 1279px) calc(66.67vw - 2.5rem), 760px"
export const PRODUCT_GALLERY_MAIN_IMAGE_WIDTHS = [
  360, 414, 640, 768, 1024, 1280,
] as const
export const PRODUCT_GALLERY_MAIN_IMAGE_DEFAULT_WIDTH = 768

export type DirectProductGalleryImage = {
  originalSrc: string
  src: string
  srcSet: string
  sizes: string
}
