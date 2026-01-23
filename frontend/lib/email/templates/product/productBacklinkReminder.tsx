import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type ProductBacklinkReminderEmailProps = {
  ownerName: string
  productName: string
  dashboardUrl: string
  rewardPoints: number
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

export default function ProductBacklinkReminderEmail({
  ownerName,
  productName,
  dashboardUrl,
  rewardPoints,
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
          <strong>{rewardPoints} rewards</strong> you can redeem for placement
          boosts and promotional spots.
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
        Add the <strong>Featured on Shipyard</strong> badge to your homepage so
        our verifier can confirm the backlink and release the reward.
      </p>

      <p style={paragraph}>
        The badge lives on your{" "}
        <a href={dashboardUrl} style={{ color: "#2563eb" }}>
          member product page
        </a>{" "}
        alongside copy-paste install instructions. Once it&#39;s live, we&#39;ll
        detect it automatically and let you know when the reward hits your
        account.
      </p>

      <div style={buttonRow}>
        <a href={dashboardUrl} style={primaryButton}>
          Grab the Shipyard badge →
        </a>
      </div>
    </BaseEmailTemplate>
  )
}
