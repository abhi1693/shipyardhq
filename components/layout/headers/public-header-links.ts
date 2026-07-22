import {
  BROWSE_PATH,
  GUIDES_PATH,
  LEADERBOARD_PATH,
  PRICING_PATH,
  TOOLS_PATH,
} from "@/lib/routes"

export const publicHeaderLinks = [
  { label: "Explore", href: BROWSE_PATH },
  { label: "Guides", href: GUIDES_PATH },
  { label: "Free Tools", href: TOOLS_PATH },
  { label: "Leaderboard", href: LEADERBOARD_PATH },
  { label: "Pricing", href: PRICING_PATH },
] as const

export function isActivePublicHeaderPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
