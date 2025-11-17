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

export function SquareImage({ size, sizes, ...props }: Props) {
  return (
    <Image {...props} width={size} height={size} sizes={sizes ?? `${size}px`} />
  )
}
