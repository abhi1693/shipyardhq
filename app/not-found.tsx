import Link from "next/link"
import { ArrowRight, BarChart3, Compass, Rocket, Trophy } from "lucide-react"

import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  LEADERBOARD_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
} from "@/lib/routes"

const destinations = [
  {
    title: "New Tech",
    description: "Discover the latest high-performance software launches.",
    href: BROWSE_PATH,
    icon: Compass,
    iconColor: "#0051d5",
  },
  {
    title: "Live Analytics",
    description: "See real-time traffic and discovery signals across Shipyard.",
    href: ANALYTICS_PATH,
    icon: BarChart3,
    iconColor: "#16a34a",
  },
  {
    title: "Daily Drops",
    description: "Find fresh launches and products moving up the leaderboard.",
    href: LEADERBOARD_PATH,
    icon: Rocket,
    iconColor: "#f97316",
  },
] as const

export default function NotFound() {
  return (
    <div className="not-found-page">
      <header className="not-found-header">
        <Link className="not-found-brand" href="/">
          Shipyard HQ
        </Link>
        <nav className="not-found-nav" aria-label="Primary">
          <Link href={BROWSE_PATH}>Browse</Link>
          <Link href={LEADERBOARD_PATH}>Leaderboard</Link>
          <Link href={ANALYTICS_PATH}>Analytics</Link>
        </nav>
      </header>

      <main className="not-found-main">
        <div className="not-found-grid" aria-hidden />
        <div className="not-found-glow" aria-hidden />

        <section className="not-found-section">
          <div className="not-found-title-stack">
            <h1 className="not-found-ghost-title" aria-hidden>
              404
            </h1>
            <div className="not-found-title-content">
              <span className="not-found-kicker">System Interruption</span>
              <h2>Lost at sea?</h2>
            </div>
          </div>

          <p className="not-found-copy">
            The page you are looking for has drifted off course or never
            existed. Let&apos;s get you back to the makers and high-performance
            discoveries.
          </p>

          <div className="not-found-actions">
            <Link
              className="not-found-button not-found-button-primary"
              href={BROWSE_PATH}
            >
              Back to Discovery
              <ArrowRight aria-hidden />
            </Link>
            <Link
              className="not-found-button not-found-button-secondary"
              href={LEADERBOARD_PATH}
            >
              <Trophy aria-hidden />
              View Leaderboard
            </Link>
          </div>

          <div className="not-found-cards">
            {destinations.map((destination) => {
              const Icon = destination.icon

              return (
                <Link
                  key={destination.href}
                  href={destination.href}
                  className="not-found-card"
                >
                  <div className="not-found-card-icon">
                    <Icon color={destination.iconColor} aria-hidden />
                  </div>
                  <h3>{destination.title}</h3>
                  <p>{destination.description}</p>
                  <span>
                    Open
                    <ArrowRight aria-hidden />
                  </span>
                </Link>
              )
            })}
          </div>

          <Link className="not-found-submit" href={MEMBER_PRODUCTS_ADD_PATH}>
            Submit your product
          </Link>
        </section>
      </main>
    </div>
  )
}
