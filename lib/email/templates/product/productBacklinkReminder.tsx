import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type ProductBacklinkReminderEmailProps = {
  ownerName: string
  productName: string
  productUrl: string
  dashboardUrl: string
  rewardsUrl: string
}

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
  margin: "0 0 16px",
} as const

const list = {
  ...paragraph,
  marginLeft: "20px",
  padding: 0,
} as const

const listItem = {
  marginBottom: "8px",
} as const

const highlight = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 18px",
  borderRadius: "9999px",
  backgroundColor: "#eef2ff",
  color: "#3730a3",
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

export default function ProductBacklinkReminderEmail({
  ownerName,
  productName,
  productUrl,
  dashboardUrl,
  rewardsUrl,
}: ProductBacklinkReminderEmailProps) {
  return (
    <BaseEmailTemplate
      title={`Secure your backlink reward for ${productName}`}
      previewText={`Add a Shipyard backlink to unlock rewards and keep ${productName} in good standing.`}
      heading={`${ownerName}, your backlink reward is still waiting`}
      intro={`Great news - ${productName} is verified. Add a Shipyard backlink so we can award the backlink verification reward and highlight your listing.`}
    >
      <p style={paragraph}>
        <span style={highlight}>What you unlock</span>
      </p>

      <ul style={list}>
        <li style={listItem}>
          <strong>Instant rewards</strong> you can redeem for placement boosts
          and promotional spots.
        </li>
        <li style={listItem}>
          <strong>Higher listing trust</strong> that keeps {productName} visible
          across Shipyard surfaces.
        </li>
        <li style={{ ...listItem, marginBottom: 0 }}>
          <strong>Automatic monitoring</strong> - we check the backlink for you
          and notify you when it&#39;s confirmed.
        </li>
      </ul>

      <p style={paragraph}>
        Drop a simple text link or use the Shipyard badge on your homepage. Once
        the link is live, our backlink verifier will pick it up on the next run
        and deliver the reward.
      </p>

      <p style={paragraph}>
        Prefer a visual callout? Grab the{" "}
        <strong>Featured on Shipyard</strong> badge from your{" "}
        <a href={dashboardUrl} style={{ color: "#2563eb" }}>
          member product page
        </a>{" "}
        and drop it on your site so visitors can discover your listing while you
        finish the reward checklist.
      </p>

      <div style={buttonRow}>
        <a href={dashboardUrl} style={primaryButton}>
          Update product settings →
        </a>
        <a href={rewardsUrl} style={secondaryButton}>
          View rewards →
        </a>
        <a href={productUrl} style={secondaryButton}>
          Preview listing →
        </a>
      </div>
    </BaseEmailTemplate>
  )
}
