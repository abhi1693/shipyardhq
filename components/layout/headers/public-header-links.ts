import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  LEADERBOARD_PATH,
  PRICING_PATH,
  REWARDS_PATH,
} from "@/lib/routes"

export const publicHeaderLinks = [
  { label: "Browse", href: BROWSE_PATH },
  { label: "Leaderboard", href: LEADERBOARD_PATH },
  { label: "Analytics", href: ANALYTICS_PATH },
  { label: "Pricing", href: PRICING_PATH },
  { label: "Rewards", href: REWARDS_PATH },
] as const
