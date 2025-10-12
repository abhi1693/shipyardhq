import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type ProductBacklinkVerifiedEmailProps = {
  ownerName: string
  productName: string
  productUrl: string
  dashboardUrl: string
  rewardsUrl: string
  backlinkUrl: string
  verifiedAt: Date
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

function formatVerifiedDate(date: Date) {
  try {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    })
  } catch {
    return "just now"
  }
}

export default function ProductBacklinkVerifiedEmail({
  ownerName,
  productName,
  productUrl,
  dashboardUrl,
  rewardsUrl,
  backlinkUrl,
  verifiedAt,
}: ProductBacklinkVerifiedEmailProps) {
  return (
    <BaseEmailTemplate
      title="Backlink verified"
      previewText={`Shipyard spotted your backlink for ${productName}.`}
      heading={`Nice work, ${ownerName || "there"}!`}
      intro={`We found a live backlink to Shipyard on ${productName}. You just earned the backlink verification reward.`}
    >
      <p style={paragraph}>
        <span style={highlight}>
          Verified at {formatVerifiedDate(verifiedAt)}
        </span>
      </p>

      <p style={paragraph}>
        We detected the link at{" "}
        <a href={backlinkUrl} style={{ color: "#2563eb" }}>
          {backlinkUrl}
        </a>
        . Keeping the backlink active helps your Shipyard listing stay in good
        standing and boosts your visibility.
      </p>

      <p style={paragraph}>
        Check your member dashboard to see the reward and explore other ways to
        grow your reach.
      </p>

      <div style={buttonRow}>
        <a href={dashboardUrl} style={primaryButton}>
          Open dashboard →
        </a>
        <a href={rewardsUrl} style={secondaryButton}>
          View rewards →
        </a>
        <a href={productUrl} style={secondaryButton}>
          View product page →
        </a>
      </div>
    </BaseEmailTemplate>
  )
}
