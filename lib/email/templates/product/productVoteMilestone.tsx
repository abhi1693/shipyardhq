import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type ProductVoteMilestoneEmailProps = {
  ownerName: string
  productName: string
  milestone: number
  totalUpvotes: number
  occurredAt: Date
  productUrl: string
  dashboardUrl: string
}

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
  margin: "0 0 16px",
} as const

const highlight = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 18px",
  borderRadius: "9999px",
  backgroundColor: "#ecfdf5",
  color: "#047857",
  fontWeight: 600,
  fontSize: "14px",
} as const

const buttonRow = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap" as const,
  marginTop: "24px",
} as const

const button = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 600,
} as const

const primaryButton = {
  ...button,
  backgroundColor: "#2563eb",
  color: "#ffffff",
} as const

const secondaryButton = {
  ...button,
  backgroundColor: "#f8fafc",
  color: "#1f2937",
  border: "1px solid #cbd5f5",
} as const

function formatTimestamp(value: Date) {
  try {
    return value.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return "just now"
  }
}

export default function ProductVoteMilestoneEmail({
  ownerName,
  productName,
  milestone,
  totalUpvotes,
  occurredAt,
  productUrl,
  dashboardUrl,
}: ProductVoteMilestoneEmailProps) {
  const milestoneLabel =
    milestone === 1 ? "First upvote" : `${milestone}+ upvotes unlocked`

  return (
    <BaseEmailTemplate
      title="New upvote milestone"
      previewText={`${productName} reached ${milestoneLabel.toLowerCase()}.`}
      heading={`Congrats, ${ownerName || "there"}!`}
      intro={`${productName} just crossed the ${milestoneLabel.toLowerCase()} at ${formatTimestamp(occurredAt)}.`}
    >
      <p style={paragraph}>
        <span style={highlight}>{milestoneLabel}</span>
      </p>

      <p style={paragraph}>
        Ship the next update while interest is high. Share the page, rally more
        supporters, and keep the momentum going.
      </p>

      <p style={paragraph}>
        You now have {totalUpvotes} total upvotes. Check analytics to see where
        new attention is coming from or refresh your listing to capture more.
      </p>

      <div style={buttonRow}>
        <a href={dashboardUrl} style={primaryButton}>
          View analytics →
        </a>
        <a href={productUrl} style={secondaryButton}>
          Open listing →
        </a>
      </div>
    </BaseEmailTemplate>
  )
}
