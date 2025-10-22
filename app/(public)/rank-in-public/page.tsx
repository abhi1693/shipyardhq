import { Suspense } from "react"

import { RankInPublicPageContent } from "@/components/templates/public/rank-in-public/page-content"
import { RankInPublicSkeleton } from "@/components/templates/public/rank-in-public/skeleton"
import { buildPageMetadata } from "@/lib/metadata"

export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: "Live Launch Battles — Head-to-head launch arena",
  description:
    "Jump into the live launch arena to upvote competing launches in real time and help rank the community's top products.",
})

export default function RankInPublicPage() {
  return (
    <Suspense fallback={<RankInPublicSkeleton />}>
      <RankInPublicPageContent />
    </Suspense>
  )
}
