import Image, { type ImageProps } from "next/image"
import clsx from "clsx"

type BrandLogoProps = Omit<ImageProps, "src" | "alt"> & {
  /**
   * Optional alt text override. Defaults to the ShipYardHQ brand name.
   */
  alt?: string
}

export function BrandLogo({
  className,
  alt = "ShipYardHQ",
  preload = false,
  loading,
  fetchPriority,
  width,
  height,
  ...restProps
}: BrandLogoProps) {
  const shared = {
    ...restProps,
    preload,
    loading: loading ?? (preload ? "eager" : undefined),
    fetchPriority: fetchPriority ?? (preload ? "high" : undefined),
    width: width ?? 32,
    height: height ?? 32,
  }

  return (
    <>
      <Image
        {...shared}
        src="/brand.png"
        alt={alt}
        className={clsx("object-contain", className, "dark:hidden")}
      />
      <Image
        {...shared}
        src="/brand-white.png"
        alt={alt}
        className={clsx("object-contain", className, "hidden dark:block")}
      />
    </>
  )
}
