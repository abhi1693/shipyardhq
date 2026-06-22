import type { ComponentProps } from "react"

import { Image } from "@/components/atoms/image"

type Props = Omit<
  ComponentProps<typeof Image>,
  "width" | "height" | "sizes"
> & {
  size: number
  /**
   * Override sizes; defaults to the fixed pixel size for accuracy.
   */
  sizes?: string
}

export function SquareImage({
  size,
  sizes,
  placeholder = "empty",
  ...props
}: Props) {
  const { alt, ...rest } = props

  return (
    <Image
      {...rest}
      alt={alt}
      width={size}
      height={size}
      sizes={sizes ?? `${size}px`}
      placeholder={placeholder}
    />
  )
}
