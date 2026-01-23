import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type UserReengagementEmailProps = {
  userName: string
  milestone: number
  memberRewardsUrl: string
  memberDashboardUrl: string
  leaderboardUrl: string
}

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
  margin: "0 0 16px",
} as const

const primaryButton = {
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

const secondaryButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 20px",
  borderRadius: "12px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 600,
  backgroundColor: "#f8fafc",
  color: "#1f2937",
  border: "1px solid #cbd5f5",
} as const

const tertiaryLink = {
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
  memberRewardsUrl,
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
        Your daily login streak paused, which means your next visit can earn new
        rewards and reignite your momentum. Bonuses are waiting in the rewards
        locker—claim them before they expire.
      </p>

      <p style={paragraph}>
        Pick up where you left off, share a fresh note with followers, or review
        the latest analytics from your product dashboard.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <a href={memberRewardsUrl} style={primaryButton}>
          Claim rewards →
        </a>
        <a href={memberDashboardUrl} style={secondaryButton}>
          Open dashboard →
        </a>
      </div>

      <a href={leaderboardUrl} style={tertiaryLink}>
        View today’s leaderboard →
      </a>
    </BaseEmailTemplate>
  )
}
