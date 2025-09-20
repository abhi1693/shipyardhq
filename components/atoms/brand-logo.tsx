import Image, { type ImageProps } from "next/image"
import clsx from "clsx"

type BrandLogoProps = Omit<ImageProps, "src" | "alt"> & {
  /**
   * Optional alt text override. Defaults to the ShipYardHQ brand name.
   */
  alt?: string
}

export function BrandLogo({ className, alt = "ShipYardHQ", ...props }: BrandLogoProps) {
  const shared = {
    ...props,
    width: props.width ?? 32,
    height: props.height ?? 32,
    priority: props.priority ?? false,
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
        className={clsx(
          "object-contain",
          className,
          "hidden dark:block",
        )}
      />
    </>
  )
}
