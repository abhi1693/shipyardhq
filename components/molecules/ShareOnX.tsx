"use client"

import { Badge } from "@/components/atoms/badge"

export default function ShareOnX({
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
      const intent = new URL("https://twitter.com/intent/tweet")
      intent.searchParams.set("text", `Check out ${productName} on ShipYardHQ`)
      intent.searchParams.set("url", absolute)
      window.open(intent.toString(), "_blank")
    } catch {}
  }
  return (
    <Badge variant="outline" className="cursor-pointer" onClick={onShare}>
      Share on X
    </Badge>
  )
}

