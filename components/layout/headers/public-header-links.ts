import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  LEADERBOARD_PATH,
  PRICING_PATH,
} from "@/lib/routes"

export const publicHeaderLinks = [
  { label: "Explore", href: BROWSE_PATH },
  { label: "Leaderboard", href: LEADERBOARD_PATH },
  { label: "Analytics", href: ANALYTICS_PATH },
  { label: "Pricing", href: PRICING_PATH },
] as const

export function isActivePublicHeaderPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
