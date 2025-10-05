import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type UserReengagementEmailProps = {
  userName: string
  milestone: number
  memberDashboardUrl: string
  leaderboardUrl: string
}

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
  margin: "0 0 16px",
} as const

const ctaButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 20px",
  borderRadius: "12px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 600,
  backgroundColor: "#2563eb",
  color: "#ffffff",
} as const

const secondaryLink = {
  display: "inline-flex",
  alignItems: "center",
  color: "#2563eb",
  fontSize: "13px",
  textDecoration: "none",
  marginTop: "12px",
} as const

export default function UserReengagementEmail({
  userName,
  milestone,
  memberDashboardUrl,
  leaderboardUrl,
}: UserReengagementEmailProps) {
  const milestoneLabel = `${milestone} day${milestone === 1 ? "" : "s"}`

  return (
    <BaseEmailTemplate
      title="Let's get back on deck"
      previewText={`It’s been ${milestoneLabel} since your last Shipyard login. Come see what's new.`}
      heading={`Hey ${userName || "friend"}, we saved your spot.`}
      intro={`It’s been ${milestoneLabel} since you last checked in. The community kept sailing — come see what's new and share your next update.`}
    >
      <p style={paragraph}>
        Shipyard’s leaderboard continues to move fast. A quick visit keeps your
        launch on the radar and helps you capture new momentum.
      </p>

      <p style={paragraph}>
        Pick up where you left off, share a fresh note with followers, or review
        the latest analytics from your product dashboard.
      </p>

      <a href={memberDashboardUrl} style={ctaButton}>
        Return to Shipyard →
      </a>

      <a href={leaderboardUrl} style={secondaryLink}>
        View today’s leaderboard →
      </a>
    </BaseEmailTemplate>
  )
}
