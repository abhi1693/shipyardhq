"use client"

import { useState, type ComponentProps, type ReactNode } from "react"

import { Image } from "@/components/atoms/image"

type ResilientImageProps = ComponentProps<typeof Image> & {
  fallback: ReactNode
}

export function ResilientImage({
  src,
  alt,
  fallback,
  onError,
  ...props
}: ResilientImageProps) {
  const [failedSrc, setFailedSrc] = useState<
    ComponentProps<typeof Image>["src"] | null
  >(null)
  const failed = failedSrc === src

  if (failed) return fallback

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      onError={(event) => {
        setFailedSrc(src)
        onError?.(event)
      }}
    />
  )
}
