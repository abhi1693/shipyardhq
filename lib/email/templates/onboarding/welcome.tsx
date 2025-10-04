import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { EMAIL_BRAND } from "@/lib/email/brand"

const paragraphStyle = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#1f2937",
} as const

const listStyle = {
  paddingLeft: "20px",
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
} as const

const linkStyle = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 500,
} as const

const DEFAULT_GREETING = "shipmate"

export type WelcomeEmailProps = {
  firstName?: string | null
  dashboardUrl: string
  isBuilder: boolean
  leaderboardUrl: string
  monthlyUrl: string
  guideUrl: string
  feedbackUrl: string
  rewardsUrl: string
}

function getGreeting(firstName?: string | null) {
  const trimmed = firstName?.trim()
  if (trimmed && trimmed.length > 0) {
    return trimmed
  }
  return DEFAULT_GREETING
}

export function WelcomeEmail({
  firstName,
  dashboardUrl,
  isBuilder,
  leaderboardUrl,
  monthlyUrl,
  guideUrl,
  feedbackUrl,
  rewardsUrl,
}: WelcomeEmailProps) {
  const greeting = getGreeting(firstName)
  const previewText =
    "Your ShipYardHQ workspace is ready. Here's how to chart the next steps."

  return (
    <BaseEmailTemplate
      title="Welcome aboard ShipYardHQ"
      previewText={previewText}
      heading={`Welcome aboard, ${greeting}!`}
      intro="Thanks for joining the ShipYardHQ fleet. Here’s how to get the most from your new workspace."
      cta={{ label: "Open your dashboard", href: dashboardUrl }}
    >
      <p style={paragraphStyle}>
        Your member hub is live with launch checklists, analytics, and product
        updates. Each time you sign in you’ll land here for mission status, to‑do
        items, and notifications:
        <br />
        <a href={dashboardUrl} style={linkStyle}>
          {dashboardUrl}
        </a>
      </p>

      <p style={paragraphStyle}>
        Shipyard Rewards powers placements across the platform. Earn it from
        verified reviews, traction updates, and streak activity, then spend it
        on perks that spotlight your product. Fleet Pulse keeps the loop tight
        with a live ledger, rolling trends, and ready-to-redeem perks:
        <br />
        <a href={rewardsUrl} style={linkStyle}>
          {rewardsUrl}
        </a>
      </p>

      <ul style={listStyle}>
        <li>Earn launch fuel by sharing honest signal with the community.</li>
        <li>Redeem it for homepage placements, analytics boosts, and perk unlocks.</li>
      </ul>

      {isBuilder ? (
        <>
          <p style={paragraphStyle}>
            Since you’re building, keep an eye on the leaderboard—it’s the
            fastest way to turn community enthusiasm into visibility:
          </p>
          <ul style={listStyle}>
            <li>
              Track your standing in real time:
              <br />
              <a href={leaderboardUrl} style={linkStyle}>
                {leaderboardUrl}
              </a>
            </li>
            <li>
              Review the scoring system so every campaign counts:
              <br />
              <a href={guideUrl} style={linkStyle}>
                {guideUrl}
              </a>
            </li>
            <li>
              Celebrate monthly champions and learn from their playbooks:
              <br />
              <a href={monthlyUrl} style={linkStyle}>
                {monthlyUrl}
              </a>
            </li>
          </ul>
        </>
      ) : (
        <p style={paragraphStyle}>
          Not launching yet? Explore trending tools and discover how other crews
          are growing:
          <br />
          <a href={leaderboardUrl} style={linkStyle}>
            {leaderboardUrl}
          </a>
        </p>
      )}

      <p style={paragraphStyle}>
        We’ll keep shipping product analytics tips, feature announcements, and
        crew perks straight to your inbox. If you need a hand, reply to this
        email and our crew will get back to you.
      </p>

      <p style={paragraphStyle}>
        Want to shape the harbor? Share feedback with the crew any time:
        <br />
        <a href={feedbackUrl} style={linkStyle}>
          {feedbackUrl}
        </a>
      </p>

      <p style={paragraphStyle}>
        Fair winds and following seas,
        <br />
        The {EMAIL_BRAND.name} crew
      </p>
    </BaseEmailTemplate>
  )
}

export function buildWelcomeTextBody({
  firstName,
  dashboardUrl,
  isBuilder,
  leaderboardUrl,
  monthlyUrl,
  guideUrl,
  feedbackUrl,
  rewardsUrl,
}: WelcomeEmailProps) {
  const greeting = getGreeting(firstName)
  const lines = [
    `Welcome aboard, ${greeting}!`,
    "",
    "Your ShipYardHQ workspace is ready. Open your dashboard:",
    dashboardUrl,
    "",
    "Shipyard Rewards powers placements. Learn how it works:",
    rewardsUrl,
    "",
    "• Earn launch fuel by sharing honest signal with the community.",
    "• Redeem it for homepage placements, analytics boosts, and perk unlocks.",
    "• Fleet Pulse tracks live balances, rolling trends, and ready-to-redeem perks.",
    "",
  ]

  if (isBuilder) {
    lines.push(
      "Since you’re building, here are the key leaderboard waypoints:",
      `• Live standings: ${leaderboardUrl}`,
      `• Scoring guide: ${guideUrl}`,
      `• Monthly champions: ${monthlyUrl}`,
      "",
    )
  } else {
    lines.push(
      "Explore trending launches from fellow makers:",
      leaderboardUrl,
      "",
    )
  }

  lines.push(
    "Need a hand? Reply to this email and our crew will help.",
    "",
    `Got ideas for the harbor? Drop feedback here: ${feedbackUrl}`,
    "",
    "Fair winds,",
    `The ${EMAIL_BRAND.name} crew`,
  )

  return lines.join("\n")
}

export default WelcomeEmail
