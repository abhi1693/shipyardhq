"use client"

import { Button } from "@/components/atoms/button"
import { BADGE_CELEBRATION_EVENT } from "@/components/molecules/ProductBadgeCelebrationGate"
import { Sparkles } from "lucide-react"

export default function ProductBadgeCelebrationTrigger({
  label = "Get badge",
}: {
  label?: string
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 px-3"
      onClick={() => {
        if (typeof window === "undefined") return
        window.dispatchEvent(new CustomEvent(BADGE_CELEBRATION_EVENT))
      }}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}
