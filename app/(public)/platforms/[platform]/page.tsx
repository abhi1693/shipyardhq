import type { Metadata } from "next"

import { PlatformPageContent } from "@/components/templates/public/platforms/page-content"
import { getPlatformMeta } from "@/lib/platforms/config"
import {
  getPlatformPagePayload,
  getPlatformStaticParams,
} from "@/lib/platforms/page-cache"
import { buildPageMetadata } from "@/lib/metadata"
import { platformPath } from "@/lib/routes"

export const revalidate = 300
export const dynamicParams = true

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
    title: `${platformMeta.label} products`,
    description:
      payload && payload.total > 0
        ? `${payload.total} ${platformMeta.label} ${payload.total === 1 ? "product" : "products"} to discover. ${platformMeta.description}`
        : platformMeta.description,
    section: "Platforms",
  })

  return {
    ...metadata,
    alternates: { canonical: platformPath(platformMeta.slug) },
  }
}

export default function PlatformPage(
  props: Parameters<typeof PlatformPageContent>[0],
) {
  return <PlatformPageContent {...props} />
}
