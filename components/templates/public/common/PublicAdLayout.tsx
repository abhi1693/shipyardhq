import type { ReactNode } from "react"

import { CarbonAd } from "@/components/molecules/CarbonAd"

export function PublicAdLayout({
  pathname,
  beforeAd,
  children,
}: {
  pathname: string
  beforeAd?: ReactNode
  children: ReactNode
}) {
  // Preserve the centered 1200px/1240px page containers. The outside ad needs
  // 1240px + 2 * (300px ad + 24px outer margin) before using the right margin.
  return (
    <div className="relative mx-auto max-w-[1240px]" data-public-ad-layout>
      {beforeAd}
      <aside
        className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 min-[1888px]:absolute min-[1888px]:inset-y-0 min-[1888px]:left-full min-[1888px]:ml-0 min-[1888px]:flex min-[1888px]:w-[300px] min-[1888px]:flex-col min-[1888px]:px-0 min-[1888px]:pt-12 min-[1888px]:[@media(min-height:480px)]:justify-end"
        aria-label="Advertisement"
        data-public-ad-slot
      >
        <div className="min-[1888px]:bottom-[var(--public-ad-bottom,1.5rem)] min-[1888px]:[@media(min-height:480px)]:sticky">
          <CarbonAd pathname={pathname} variant="banner" className="mx-auto" />
        </div>
      </aside>
      {children}
    </div>
  )
}
