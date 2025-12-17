"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog"
import { Button } from "@/components/atoms/button"
import { Textarea } from "@/components/atoms/textarea"
import { Image } from "@/components/atoms/image"
import CopyButton from "@/components/molecules/CopyButton"
import { siteConfig } from "@/lib/siteConfig"

type BadgeTheme = "light" | "dark"
type BadgeVariant = "featured" | "revenue"
type BadgeFormat = "svg" | "png"

const BADGE_THEMES: Array<{
  id: BadgeTheme
  label: string
  description: string
}> = [
  {
    id: "light",
    label: "Light theme",
    description: "Use on darker backgrounds",
  },
  {
    id: "dark",
    label: "Dark theme",
    description: "Use on lighter backgrounds",
  },
]

const BADGE_VARIANTS: Array<{
  id: BadgeVariant
  label: string
  description: string
}> = [
  {
    id: "featured",
    label: "Featured badge",
    description: "Shows your feature on Shipyard",
  },
  {
    id: "revenue",
    label: "Total revenue",
    description: "Shows lifetime revenue and verification",
  },
]

const BADGE_FORMATS: Array<{
  id: BadgeFormat
  label: string
  description: string
}> = [
  {
    id: "svg",
    label: "SVG",
    description: "Inline SVG markup (no <img>)",
  },
  {
    id: "png",
    label: "PNG",
    description: "Image tag embed",
  },
]

function indentLines(value: string, spaces = 2) {
  const prefix = " ".repeat(spaces)
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n")
}

export function ProductBadgeCelebrationDialog({
  open,
  onOpenChange,
  productPublicPath,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productPublicPath?: string
}) {
  const [theme, setTheme] = useState<BadgeTheme>("light")
  const [badgeVariant, setBadgeVariant] = useState<BadgeVariant>("featured")
  const [format, setFormat] = useState<BadgeFormat>("svg")
  const [svgPayload, setSvgPayload] = useState<{
    url: string
    markup: string
  } | null>(null)
  const origin = useMemo(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin
    }
    return siteConfig.url
  }, [])

  const productUrl = useMemo(() => {
    if (!productPublicPath) return siteConfig.url
    try {
      return new URL(productPublicPath, siteConfig.url).toString()
    } catch {
      return siteConfig.url
    }
  }, [productPublicPath])

  const productSlug = useMemo(() => {
    if (!productPublicPath) return null
    try {
      const url = new URL(productPublicPath, siteConfig.url)
      const slugCandidate = url.pathname.split("/").filter(Boolean).pop()
      return slugCandidate ?? null
    } catch {
      return null
    }
  }, [productPublicPath])
  const isMissingProduct = !productSlug

  const baseBadgeUrl = useMemo(() => {
    if (!productSlug) return null
    try {
      const url = new URL(`/api/embed/products/${productSlug}`, origin)
      url.searchParams.set("theme", theme)
      url.searchParams.set("type", badgeVariant)
      return url.toString()
    } catch {
      return null
    }
  }, [badgeVariant, origin, productSlug, theme])

  const svgBadgeUrl = useMemo(() => {
    if (!baseBadgeUrl) return null
    try {
      const url = new URL(baseBadgeUrl)
      url.searchParams.set("format", "svg")
      return url.toString()
    } catch {
      return baseBadgeUrl
    }
  }, [baseBadgeUrl])

  const pngBadgeUrl = useMemo(() => {
    if (!baseBadgeUrl) return null
    try {
      const url = new URL(baseBadgeUrl)
      url.searchParams.set("format", "png")
      return url.toString()
    } catch {
      return baseBadgeUrl
    }
  }, [baseBadgeUrl])

  const previewBadgeUrl = useMemo(() => {
    return pngBadgeUrl
  }, [pngBadgeUrl])

  useEffect(() => {
    if (format !== "svg") return
    if (!svgBadgeUrl || isMissingProduct) return

    const controller = new AbortController()

    fetch(svgBadgeUrl, {
      signal: controller.signal,
      headers: {
        Accept: "image/svg+xml,text/plain;q=0.9,*/*;q=0.1",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Badge request failed with status ${response.status}`)
        }
        return await response.text()
      })
      .then((text) => {
        if (controller.signal.aborted) return
        setSvgPayload({ url: svgBadgeUrl, markup: text })
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setSvgPayload(null)
      })

    return () => {
      controller.abort()
    }
  }, [format, isMissingProduct, svgBadgeUrl])

  const embedCode = useMemo(() => {
    if (format === "png") {
      const badgeUrl = pngBadgeUrl ?? ""
      return `<a href="${productUrl}" target="_blank" rel="noopener">\n  <img src="${badgeUrl}" alt="Shipyard badge" style="max-width: 500px;" />\n</a>`
    }

    if (!svgBadgeUrl) return ""
    if (!svgPayload || svgPayload.url !== svgBadgeUrl) return ""

    return `<a href="${productUrl}" target="_blank" rel="noopener">\n${indentLines(svgPayload.markup)}\n</a>`
  }, [format, pngBadgeUrl, productUrl, svgBadgeUrl, svgPayload])

  const handleThemeSelect = useCallback((nextTheme: BadgeTheme) => {
    setTheme(nextTheme)
  }, [])

  const handleVariantSelect = useCallback((nextVariant: BadgeVariant) => {
    setBadgeVariant(nextVariant)
  }, [])

  const handleFormatSelect = useCallback((nextFormat: BadgeFormat) => {
    setFormat(nextFormat)
  }, [])

  const canCopyEmbed =
    format === "png" || (svgPayload?.url === svgBadgeUrl && !!svgPayload.markup)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Congratulations on the new launch!</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pick a badge style and copy the embed. The badge stays in sync with
            your stats.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full space-y-4">
          <section className="rounded-lg border bg-muted/50 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Badge type
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {BADGE_VARIANTS.map((variant) => (
                    <Button
                      key={variant.id}
                      type="button"
                      size="sm"
                      variant={
                        badgeVariant === variant.id ? "default" : "outline"
                      }
                      onClick={() => handleVariantSelect(variant.id)}
                      className="h-9 px-3 text-sm"
                    >
                      {variant.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Theme
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {BADGE_THEMES.map((themeOption) => (
                    <Button
                      key={themeOption.id}
                      type="button"
                      size="sm"
                      variant={
                        theme === themeOption.id ? "secondary" : "outline"
                      }
                      onClick={() => handleThemeSelect(themeOption.id)}
                      className="h-9 px-3 text-sm"
                    >
                      {themeOption.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Format
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {BADGE_FORMATS.map((formatOption) => (
                    <Button
                      key={formatOption.id}
                      type="button"
                      size="sm"
                      variant={format === formatOption.id ? "secondary" : "outline"}
                      onClick={() => handleFormatSelect(formatOption.id)}
                      className="h-9 px-3 text-sm"
                    >
                      {formatOption.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-background/80 p-4">
            <div className="flex flex-col items-center gap-3">
              <Image
                src={previewBadgeUrl ?? svgBadgeUrl ?? ""}
                alt={
                  productSlug
                    ? `Badge preview for ${productSlug}`
                    : "Badge preview"
                }
                width={520}
                height={170}
                className="mx-auto h-auto w-full max-w-[520px] max-h-[170px] object-contain"
                loading="eager"
                placeholder="empty"
                unoptimized
              />
              {isMissingProduct ? (
                <p className="text-[11px] text-destructive text-center">
                  Missing product URL. Open this from a product page to preview
                  your badge.
                </p>
              ) : null}
            </div>
          </section>

          <section className="space-y-2 w-full">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Embed code</h3>
              <CopyButton
                text={embedCode}
                size="sm"
                className="h-8 px-3"
                disabled={!canCopyEmbed}
              >
                Copy
              </CopyButton>
            </div>
            <Textarea
              value={embedCode}
              readOnly
              rows={3}
              placeholder={
                format === "svg" && !canCopyEmbed
                  ? "Generating SVG embed..."
                  : undefined
              }
              className="font-mono text-xs whitespace-pre-wrap break-words break-all"
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductBadgeCelebrationDialog
