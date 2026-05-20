import type { ComponentProps } from "react"

import { Image } from "@/components/atoms/image"
import clsx from "clsx"

export type BrandLogoProps = Omit<
  ComponentProps<typeof Image>,
  "src" | "alt"
> & {
  /**
   * Optional alt text override. Defaults to the ShipYardHQ brand name.
   */
  alt?: string
}

export function BrandLogo({
  className,
  alt = "ShipYardHQ",
  eager = false,
  loading,
  fetchPriority,
  width,
  height,
  ...restProps
}: BrandLogoProps) {
  const shared = {
    ...restProps,
    eager,
    unoptimized: true,
    loading: loading ?? (eager ? "eager" : undefined),
    fetchPriority: fetchPriority ?? (eager ? "high" : undefined),
    width: width ?? 32,
    height: height ?? 32,
    placeholder: "empty" as const,
  }

  return (
    <>
      <Image
        {...shared}
        src="/brand.svg"
        alt={alt}
        className={clsx("object-contain", className, "dark:hidden")}
      />
      <Image
        {...shared}
        src="/brand-white.svg"
        alt={alt}
        className={clsx("object-contain", className, "hidden dark:block")}
      />
    </>
  )
}
