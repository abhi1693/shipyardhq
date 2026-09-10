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
  // Reserve equal margins so the content stays centered in the viewport. Only
  // the right margin contains an ad; its width grows from 240px to 300px.
  return (
    <div
      className="@container/public-ad relative mx-auto max-w-[1240px] [--public-ad-width:clamp(240px,20vw,300px)] min-[75rem]:w-[calc(100%_-_2*(var(--public-ad-width)_+_24px))]"
      data-public-ad-layout
    >
      {beforeAd}
      <aside
        className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 min-[75rem]:absolute min-[75rem]:inset-y-0 min-[75rem]:left-full min-[75rem]:ml-0 min-[75rem]:flex min-[75rem]:w-[var(--public-ad-width)] min-[75rem]:flex-col min-[75rem]:px-0 min-[75rem]:pt-12 min-[75rem]:[@media(min-height:480px)]:justify-end"
        aria-label="Advertisement"
        data-public-ad-slot
      >
        <div className="min-[75rem]:bottom-[var(--public-ad-bottom,1.5rem)] min-[75rem]:[@media(min-height:480px)]:sticky">
          <CarbonAd pathname={pathname} variant="banner" className="mx-auto" />
        </div>
      </aside>
      {children}
    </div>
  )
}
