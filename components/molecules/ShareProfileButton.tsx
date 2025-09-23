"use client"

import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"
import { Twitter } from "lucide-react"

interface ShareProfileButtonProps {
  path: string
  fullName: string
  productCount: number
  className?: string
}

export default function ShareProfileButton({
  path,
  fullName,
  productCount,
  className,
}: ShareProfileButtonProps) {
  function getShareUrl() {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      if (path.startsWith("http")) return path
      if (origin) return new URL(path, origin).toString()
      return path
    } catch {
      return path
    }
  }

  function getShareText() {
    const displayName = fullName.trim() || "this builder"
    const headline =
      productCount > 1
        ? `${displayName}'s ${productCount} product launches`
        : productCount === 1
          ? `${displayName}'s latest product`
          : `${displayName}'s builder profile`
    return `Check out ${headline} on ShipYardHQ`
  }

  function handleShare() {
    try {
      const intent = new URL("https://x.com/intent/tweet")
      intent.searchParams.set("text", getShareText())
      intent.searchParams.set("url", getShareUrl())
      window.open(intent.toString(), "_blank", "noopener")
    } catch {}
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleShare}
      className={cn("gap-2", className)}
    >
      <Twitter className="h-4 w-4" />
      Share profile
    </Button>
  )
}
