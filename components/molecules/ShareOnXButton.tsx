"use client"

import { Button } from "@/components/atoms/button"
import { Twitter } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ShareOnXButton({
  path,
  productName,
  tagline,
  className,
  variant = "outline",
}: {
  path: string
  productName: string
  tagline?: string | null
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
}) {
  function onShare() {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const absolute = new URL(path, origin).toString()
      const intent = new URL("https://x.com/intent/tweet")
      const cleanedTagline = typeof tagline === "string" ? tagline.trim() : ""
      const headline = cleanedTagline
        ? `${productName} — ${cleanedTagline}`
        : productName
      intent.searchParams.set("text", `Check out ${headline} on ShipYardHQ`)
      intent.searchParams.set("url", absolute)
      window.open(intent.toString(), "_blank")
    } catch {}
  }
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onShare}
      className={cn(className)}
    >
      <Twitter className="h-4 w-4 mr-2" /> Share on X
    </Button>
  )
}
