"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/atoms/dialog"
import { Button } from "@/components/atoms/button"
import { Textarea } from "@/components/atoms/textarea"
import CopyButton from "@/components/molecules/CopyButton"
import { siteConfig } from "@/lib/siteConfig"

type BadgeVariant = {
  id: "light" | "dark"
  label: string
  description: string
  path: string
}

const BADGES: BadgeVariant[] = [
  {
    id: "light",
    label: "Light badge",
    description: "Best on darker backgrounds",
    path: "/featured-on-light.png",
  },
  {
    id: "dark",
    label: "Dark badge",
    description: "Best on lighter backgrounds",
    path: "/featured-on-dark.png",
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
  const [origin, setOrigin] = useState(() => siteConfig.url)
  const [activeBadgeId, setActiveBadgeId] = useState<BadgeVariant["id"]>(
    BADGES[0].id,
  )

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const activeBadge = useMemo(
    () => BADGES.find((badge) => badge.id === activeBadgeId) ?? BADGES[0],
    [activeBadgeId],
  )

  const productUrl = useMemo(() => {
    if (!productPublicPath) return siteConfig.url
    try {
      return new URL(productPublicPath, siteConfig.url).toString()
    } catch {
      return siteConfig.url
    }
  }, [productPublicPath])

  const badgeUrl = useMemo(() => {
    try {
      return new URL(activeBadge.path, origin).toString()
    } catch {
      if (origin.endsWith("/")) {
        return `${origin.slice(0, -1)}${activeBadge.path}`
      }
      return `${origin}${activeBadge.path}`
    }
  }, [activeBadge.path, origin])

  const embedCode = useMemo(
    () =>
      `<a href="${productUrl}" target="_blank" rel="noopener">\n  <img src="${badgeUrl}" alt="Featured on ${siteConfig.name}" style="height: 56px;" />\n</a>`,
    [badgeUrl, productUrl],
  )

  const handleBadgeSelect = useCallback((variantId: BadgeVariant["id"]) => {
    setActiveBadgeId(variantId)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:min-w-[75rem] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Congratulations on the new launch!</DialogTitle>
          <DialogDescription>
            <span>
              Celebrate your feature on {siteConfig.name} by adding this badge
              to your website. Copy the snippet below or download the asset
              directly.
            </span>
            <span className="mt-2 block text-muted-foreground">
              Drop it on your homepage and you&apos;ll automatically earn the
              backlink verification reward once we spot the link.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 w-full">
          <section className="flex w-full flex-col items-center gap-4 rounded-lg border bg-muted/40 p-6 text-center">
            <div className="space-y-3">
              <p className="text-sm font-medium">Badge preview</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {BADGES.map((badge) => (
                  <Button
                    key={badge.id}
                    type="button"
                    size="sm"
                    variant={
                      badge.id === activeBadge.id ? "default" : "outline"
                    }
                    onClick={() => handleBadgeSelect(badge.id)}
                  >
                    {badge.label}
                  </Button>
                ))}
              </div>
            </div>
            <Image
              src={activeBadge.path}
              alt={`Featured on ${siteConfig.name}`}
              width={400}
              height={130}
              loading="eager"
              fetchPriority="high"
              className="h-auto w-full max-w-lg"
            />
            <p className="text-xs text-muted-foreground">
              {activeBadge.description}. Prefer hosting it yourself? Save the
              image or use the embed code below.
            </p>
          </section>

          <section className="space-y-2 w-full">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Embed code</h3>
              <CopyButton text={embedCode} size="sm" className="h-8 px-3">
                <>Copy embed</>
              </CopyButton>
            </div>
            <Textarea
              value={embedCode}
              readOnly
              rows={4}
              className="whitespace-pre font-mono text-xs"
            />
          </section>
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Need alternatives? Try the badge on a contrasting background to see
            what fits.
          </div>
          <DialogClose asChild>
            <Button type="button">View my products</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ProductBadgeCelebrationDialog
