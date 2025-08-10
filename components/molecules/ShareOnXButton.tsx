"use client"

import { Button } from "@/components/atoms/button"
import { Twitter } from "lucide-react"

export default function ShareOnXButton({
  path,
  productName,
}: {
  path: string
  productName: string
}) {
  function onShare() {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const absolute = new URL(path, origin).toString()
      const intent = new URL("https://x.com/intent/tweet")
      intent.searchParams.set("text", `Check out ${productName} on ShipYardHQ`)
      intent.searchParams.set("url", absolute)
      window.open(intent.toString(), "_blank")
    } catch {}
  }
  return (
    <Button variant="outline" size="sm" onClick={onShare}>
      <Twitter className="h-4 w-4 mr-2" /> Share on X
    </Button>
  )
}

