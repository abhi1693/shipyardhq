"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-12 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  width = 48,
  height = 48,
  src,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  const resolvedWidth = React.useMemo(() => {
    if (typeof width === "number" && Number.isFinite(width)) {
      return width
    }
    if (typeof width === "string") {
      const parsed = Number.parseInt(width, 10)
      return Number.isFinite(parsed) ? parsed : undefined
    }
    return undefined
  }, [width])

  const resolvedHeight = React.useMemo(() => {
    if (typeof height === "number" && Number.isFinite(height)) {
      return height
    }
    if (typeof height === "string") {
      const parsed = Number.parseInt(height, 10)
      return Number.isFinite(parsed) ? parsed : undefined
    }
    return undefined
  }, [height])

  const optimizedSrc = React.useMemo(() => {
    if (!src || typeof src !== "string") return src
    if (!/^https?:\/\//.test(src)) return src

    try {
      const url = new URL(src)
      const host = url.hostname
      const shouldOptimize = /clerk/i.test(host)

      if (!shouldOptimize) {
        return src
      }

      if (resolvedWidth) {
        url.searchParams.set("width", resolvedWidth.toString())
      }
      if (resolvedHeight) {
        url.searchParams.set("height", resolvedHeight.toString())
      }
      url.searchParams.set("quality", "75")

      return url.toString()
    } catch {
      return src
    }
  }, [src, resolvedWidth, resolvedHeight])

  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full",
        className,
      )}
      width={resolvedWidth}
      height={resolvedHeight}
      src={optimizedSrc}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
