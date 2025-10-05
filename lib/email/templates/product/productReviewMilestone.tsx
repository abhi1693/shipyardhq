import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type ProductReviewMilestoneEmailProps = {
  ownerName: string
  productName: string
  milestone: number
  reviewCount: number
  totalReviews: number
  periodStart: Date
  periodEnd: Date
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
  backgroundColor: "#f0f9ff",
  color: "#0369a1",
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

function formatRange(start: Date, end: Date) {
  try {
    const startLabel = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    const endLabel = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    return `${startLabel} – ${endLabel}`
  } catch {
    return "the past day"
  }
}

export default function ProductReviewMilestoneEmail({
  ownerName,
  productName,
  milestone,
  reviewCount,
  totalReviews,
  periodStart,
  periodEnd,
  productUrl,
  dashboardUrl,
}: ProductReviewMilestoneEmailProps) {
  return (
    <BaseEmailTemplate
      title="Review milestone unlocked"
      previewText={`${productName} just crossed ${milestone}+ total reviews.`}
      heading={`Nice work, ${ownerName || "there"}!`}
      intro={`${productName} picked up ${reviewCount} new reviews between ${formatRange(periodStart, periodEnd)}.`}
    >
      <p style={paragraph}>
        <span style={highlight}>{`Milestone: ${milestone}+ lifetime reviews`}</span>
      </p>

      <p style={paragraph}>
        Keep the momentum going by replying back, sharing the wins with your
        community, or highlighting the best quotes on your listing.
      </p>

      <p style={paragraph}>
        You now have {totalReviews} total reviews. Customers are listening—make
        sure they hear from you too.
      </p>

      <div style={buttonRow}>
        <a href={dashboardUrl} style={primaryButton}>
          Open dashboard →
        </a>
        <a href={productUrl} style={secondaryButton}>
          View public page →
        </a>
      </div>
    </BaseEmailTemplate>
  )
}
