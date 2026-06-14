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
  const origin = useMemo(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin
    }
    return siteConfig.url
  }, [])

  const productUrl = useMemo(() => {
    if (!productPublicPath) return origin
    try {
      return new URL(productPublicPath, origin).toString()
    } catch {
      return origin
    }
  }, [origin, productPublicPath])

  const productSlug = useMemo(() => {
    if (!productPublicPath) return null
    try {
      const url = new URL(productPublicPath, origin)
      const slugCandidate = url.pathname.split("/").filter(Boolean).pop()
      return slugCandidate ?? null
    } catch {
      return null
    }
  }, [origin, productPublicPath])
  const isMissingProduct = !productSlug

  const baseBadgeUrl = useMemo(() => {
    if (!productSlug) return null
    try {
      const url = new URL(`/api/embed/products/${productSlug}`, origin)
      url.searchParams.set("theme", theme)
      url.searchParams.set("type", "featured")
      url.searchParams.set("format", "svg")
      return url.toString()
    } catch {
      return null
    }
  }, [origin, productSlug, theme])

  const embedCode = useMemo(() => {
    if (!baseBadgeUrl) return ""
    return `<a href="${productUrl}" target="_blank" rel="noopener">\n  <img src="${baseBadgeUrl}" alt="Shipyard badge" style="max-width: 500px; width: 100%; height: auto;" />\n</a>`
  }, [baseBadgeUrl, productUrl])

  const handleThemeSelect = useCallback((nextTheme: BadgeTheme) => {
    setTheme(nextTheme)
  }, [])

  const canCopyEmbed = Boolean(embedCode)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Congratulations on the new launch!</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pick a badge style and copy the embed. The badge stays in sync with
            your listing status.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full space-y-4">
          <section className="rounded-lg border bg-muted/50 p-4">
            <div className="space-y-2">
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
                src={baseBadgeUrl ?? ""}
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
              className="font-mono text-xs whitespace-pre-wrap break-words break-all"
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductBadgeCelebrationDialog
