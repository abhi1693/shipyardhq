"use client"

import { Button } from "@/components/atoms/button"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Sparkles } from "lucide-react"

export default function ProductBadgeCelebrationTrigger({
  label = "Get badge",
}: {
  label?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 px-3"
      onClick={() => {
        const params = new URLSearchParams(searchParams?.toString() ?? "")
        params.set("celebrate", "1")
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        })
      }}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}
