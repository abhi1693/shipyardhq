"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"

import { CarbonAdSlot } from "@/components/molecules/CarbonAd"

function FeedSlot({ section }: { section: string }) {
  const pathname = usePathname()
  return pathname ? (
    <CarbonAdSlot pathname={pathname} template="feed" section={section} />
  ) : null
}

export function CarbonFeedAd({ section }: { section: string }) {
  return (
    <Suspense
      fallback={<div className="hidden min-h-[106px] xl:block" aria-hidden />}
    >
      <FeedSlot section={section} />
    </Suspense>
  )
}
