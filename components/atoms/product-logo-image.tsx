"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"

import { cn } from "@/lib/utils"

type ProductLogoImageProps = Omit<ImageProps, "alt" | "src"> & {
  name: string
  src?: string | null
  fallbackClassName?: string
}

export function resolveProductLogoSrc(src?: string | null) {
  const normalized = src?.trim()
  if (!normalized) return null

  try {
    const url = new URL(normalized)
    if (url.hostname === "logo.clearbit.com") return null
    if (
      (url.hostname === "shipyardhq.dev" ||
        url.hostname === "www.shipyardhq.dev") &&
      url.pathname === "/logo.png"
    ) {
      return "/brand.png"
    }
  } catch {
    // Relative and non-URL image paths remain valid Next.js image sources.
  }

  return normalized
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "S"
  )
}

export function ProductLogoImage({
  name,
  src,
  fallbackClassName,
  onError,
  ...props
}: ProductLogoImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const resolvedSrc = resolveProductLogoSrc(src)
  const failed = Boolean(resolvedSrc && failedSrc === resolvedSrc)

  if (!resolvedSrc || failed) {
    return (
      <span
        data-product-logo-fallback=""
        className={cn(
          "flex h-full w-full items-center justify-center bg-[#e5eeff] text-sm font-bold uppercase text-[#334155]",
          fallbackClassName,
        )}
        aria-label={`${name} logo`}
      >
        {initials(name)}
      </span>
    )
  }

  return (
    <Image
      {...props}
      src={resolvedSrc}
      alt={`${name} logo`}
      onError={(event) => {
        setFailedSrc(resolvedSrc)
        onError?.(event)
      }}
    />
  )
}
