import { permanentRedirect } from "next/navigation"

import { buildPageMetadata } from "@/lib/metadata"
import { LEADERBOARD_PATH } from "@/lib/routes"

const PAGE_TITLE = "Shipyard Leaderboard"
export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: "This page has moved to the Shipyard leaderboard.",
  canonical: LEADERBOARD_PATH,
})

export default function VerifiedRevenuePage() {
  permanentRedirect(LEADERBOARD_PATH)
}
