"use client"

import { useCallback, useMemo, useState } from "react"

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

  const previewBadgeUrl = useMemo(() => {
    if (!baseBadgeUrl) return null
    try {
      const url = new URL(baseBadgeUrl)
      url.searchParams.set("format", "png")
      return url.toString()
    } catch {
      return baseBadgeUrl
    }
  }, [baseBadgeUrl])

  const badgeUrl = baseBadgeUrl ?? ""
  const embedCode = useMemo(
    () =>
      `<a href="${productUrl}" target="_blank" rel="noopener">\n  <img src="${badgeUrl}" alt="Shipyard badge" style="max-width: 500px;" />\n</a>`,
    [badgeUrl, productUrl],
  )

  const handleThemeSelect = useCallback((nextTheme: BadgeTheme) => {
    setTheme(nextTheme)
  }, [])

  const handleVariantSelect = useCallback((nextVariant: BadgeVariant) => {
    setBadgeVariant(nextVariant)
  }, [])

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
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>
          </section>

          <section className="rounded-lg border bg-background/80 p-4">
            <div className="flex flex-col items-center gap-3">
              <Image
                src={previewBadgeUrl ?? badgeUrl}
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
              <CopyButton text={embedCode} size="sm" className="h-8 px-3">
                Copy
              </CopyButton>
            </div>
            <Textarea
              value={embedCode}
              readOnly
              rows={3}
              className="font-mono text-xs whitespace-pre-wrap break-words break-all"
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductBadgeCelebrationDialog
