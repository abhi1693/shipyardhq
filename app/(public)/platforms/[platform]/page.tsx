import type { Metadata } from "next"
import { Suspense } from "react"

import { PlatformPageContent } from "@/components/templates/public/platforms/page-content"
import { getPlatformMeta } from "@/lib/platforms/config"
import {
  getPlatformPagePayload,
  getPlatformStaticParams,
} from "@/lib/platforms/page-cache"
import { buildPageMetadata } from "@/lib/metadata"
import { platformPath } from "@/lib/routes"
import { BRAND_NAME } from "@/lib/brand"

export function generateStaticParams() {
  return getPlatformStaticParams()
}

export async function generateMetadata(
  props: Parameters<typeof PlatformPageContent>[0],
): Promise<Metadata> {
  const { platform } = await props.params
  const platformMeta = getPlatformMeta(platform)
  if (!platformMeta) return {}

  const payload = await getPlatformPagePayload(platformMeta.slug, {
    sort: "new",
    page: 1,
    verified: false,
  })

  const metadata = buildPageMetadata({
    title: `${platformMeta.label} products and launches`,
    description:
      payload && payload.total > 0
        ? `Discover ${payload.total} ${platformMeta.label} ${payload.total === 1 ? "product" : "products"} launching on ${BRAND_NAME}. ${platformMeta.description}`
        : `Discover ${platformMeta.label} product launches on ${BRAND_NAME}. ${platformMeta.description}`,
    section: "Platforms",
    canonical: platformPath(platformMeta.slug),
  })

  return metadata
}

export default function PlatformPage(
  props: Parameters<typeof PlatformPageContent>[0],
) {
  return (
    <Suspense fallback={null}>
      <PlatformPageContent {...props} />
    </Suspense>
  )
}
