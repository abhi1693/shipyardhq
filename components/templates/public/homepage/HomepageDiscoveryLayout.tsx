import type { ReactNode } from "react"

import { PublicAdLayout } from "@/components/templates/public/common/PublicAdLayout"
import { HOME_PATH } from "@/lib/routes"

export function HomepageDiscoveryLayout({
  sponsoredLaunch,
  children,
}: {
  sponsoredLaunch: ReactNode
  children: ReactNode
}) {
  return (
    <div data-homepage-discovery>
      <PublicAdLayout pathname={HOME_PATH} beforeAd={sponsoredLaunch}>
        {children}
      </PublicAdLayout>
    </div>
  )
}
