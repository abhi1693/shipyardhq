import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { GuidePage } from "@/components/templates/public/guides/GuidePage"
import { GUIDES, getGuide } from "@/lib/guides/catalog"
import { buildPageMetadata } from "@/lib/metadata"
import { guidePath } from "@/lib/routes"

type GuidePageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) return {}

  return buildPageMetadata({
    title: guide.title,
    section: "Founder Guides",
    description: guide.metaDescription,
    canonical: guidePath(guide.slug),
    openGraph: {
      type: "article",
      url: guidePath(guide.slug),
      title: guide.title,
      description: guide.metaDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.metaDescription,
    },
  })
}

export default async function FounderGuidePage({ params }: GuidePageProps) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) notFound()

  return <GuidePage guide={guide} />
}
