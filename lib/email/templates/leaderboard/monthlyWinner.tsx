import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { EMAIL_BRAND } from "@/lib/email/brand"

export type MonthlyWinnerEmailProps = {
  productName: string
  monthLabel: string
  rank: number
  productUrl: string
  leaderboardUrl: string
  highlightBadge?: boolean
}

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

const rankMessages: Record<number, string> = {
  1: "You just hoisted the flagship pennant across the Shipyard HQ fleet.",
  2: "Your launch sailed in with silver sails and a second-place berth.",
  3: "You secured a bronze helm and charted a podium finish.",
}

function getRankMessage(rank: number): string {
  return rankMessages[rank] ?? `You placed #${rank} on the leaderboard.`
}

function getRankTitle(rank: number): string {
  switch (rank) {
    case 1:
      return "Flagship of the month"
    case 2:
      return "Silver sail finisher"
    case 3:
      return "Bronze helm honoree"
    default:
      return `Top #${rank} in the fleet`
  }
}

export function MonthlyWinnerEmail({
  productName,
  monthLabel,
  rank,
  productUrl,
  leaderboardUrl,
  highlightBadge = rank === 1,
}: MonthlyWinnerEmailProps) {
  const heading = `${productName} is a ${getRankTitle(rank)} for ${monthLabel}`
  const rankMessage = getRankMessage(rank)

  return (
    <BaseEmailTemplate
      title={`${productName} ranked #${rank} in ${monthLabel}`}
      previewText={`${productName} finished #${rank} in ${monthLabel}—fair winds from ${EMAIL_BRAND.name}!`}
      heading={heading}
      intro={rankMessage}
      cta={{ label: `View ${monthLabel} standings`, href: leaderboardUrl }}
    >
      <p style={paragraphStyle}>
        Your crew just rode a perfect tailwind to the top of the fleet. Keep the
        tide turning by sharing your product page with customers and community
        supporters:
        <br />
        <a href={productUrl} style={linkStyle}>
          {productUrl}
        </a>
      </p>

      {highlightBadge ? (
        <p style={paragraphStyle}>
          As the flagship this month, you’ve hoisted our{" "}
          <strong>Editor’s Pick</strong>
          ensign and earned a fresh spotlight on the homepage. Let the fleet see
          that pennant flying high—your crew deserves the cheers.
        </p>
      ) : null}

      <p style={paragraphStyle}>Set your next headings with these waypoints:</p>
      <ol style={listStyle}>
        <li>
          Log the victory on social, tag {EMAIL_BRAND.name}, and share a
          snapshot of your new pennant.
        </li>
        <li>
          Invite fresh testimonials from the passengers who just came aboard.
        </li>
        <li>
          Plot the next voyage—feature updates, pricing tweaks, or a new launch.
        </li>
      </ol>

      <p style={paragraphStyle}>
        We&apos;ll keep your vessel in the public log for the rest of the month.
        See how you stack up alongside the rest of the ${monthLabel} fleet:
        <br />
        <a href={leaderboardUrl} style={linkStyle}>
          {leaderboardUrl}
        </a>
      </p>

      <p style={paragraphStyle}>Fair winds and following seas,</p>
      <p style={paragraphStyle}>The {EMAIL_BRAND.name} crew at the helm</p>
    </BaseEmailTemplate>
  )
}

export default MonthlyWinnerEmail
