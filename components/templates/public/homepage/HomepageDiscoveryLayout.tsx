import type { ReactNode } from "react"

import { CarbonAd } from "@/components/molecules/CarbonAd"
import { HOME_PATH } from "@/lib/routes"

export function HomepageDiscoveryLayout({
  sponsoredLaunch,
  children,
}: {
  sponsoredLaunch: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className="mx-auto max-w-[1600px] 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_300px] 2xl:gap-x-6 2xl:px-6"
      data-homepage-discovery
    >
      <div className="min-w-0 2xl:col-start-1 2xl:row-start-1">
        {sponsoredLaunch}
      </div>
      <aside
        className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 2xl:col-start-2 2xl:row-span-2 2xl:row-start-1 2xl:flex 2xl:max-w-none 2xl:flex-col 2xl:px-0 2xl:pt-12 2xl:[@media(min-height:480px)]:justify-end"
        aria-label="Homepage advertisement"
      >
        <div className="2xl:bottom-6 2xl:[@media(min-height:480px)]:sticky">
          <CarbonAd pathname={HOME_PATH} variant="banner" className="mx-auto" />
        </div>
      </aside>
      <div className="min-w-0 2xl:col-start-1 2xl:row-start-2">{children}</div>
    </div>
  )
}
