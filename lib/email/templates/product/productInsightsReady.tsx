import type { CSSProperties } from "react"

import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type ProductInsightInsightsReadyEmailProps = {
  productName: string
  insightsUrl: string
}

const paragraphStyle: CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#1f2937",
}

const listStyle: CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
  margin: "0 0 16px 16px",
  padding: 0,
}

const listItemStyle: CSSProperties = {
  marginBottom: "8px",
}

export function ProductInsightInsightsReadyEmail({
  productName,
  insightsUrl,
}: ProductInsightInsightsReadyEmailProps) {
  return (
    <BaseEmailTemplate
      title={`Fresh intelligence for ${productName}`}
      previewText={`Top signals, emerging conversations, and next moves are waiting for ${productName}.`}
      heading={`${productName} insights just landed`}
      intro="We just finished synthesizing the latest discovery signals. Jump in now to see what's moving and what to do next."
      cta={{ label: "See the full insight report", href: insightsUrl }}
    >
      <p style={paragraphStyle}>
        Inside your dashboard you&apos;ll get an at-a-glance breakdown of what&apos;s
        changed and where the momentum is building.
      </p>

      <ul style={listStyle}>
        <li style={listItemStyle}>
          <strong>Live signal shifts</strong> that spotlight the channels and
          conversations heating up.
        </li>
        <li style={listItemStyle}>
          <strong>Audience sentiment snapshots</strong> to reveal what people
          are celebrating or questioning right now.
        </li>
        <li style={{ ...listItemStyle, marginBottom: 0 }}>
          <strong>Recommended next moves</strong> tailored to keep your crew
          shipping with confidence.
        </li>
      </ul>

      <p style={paragraphStyle}>
        Tap through while the insights are fresh so you can act before the rest
        of the market catches up. We will keep the updates flowing straight to
        your inbox whenever a new pass is ready.
      </p>
    </BaseEmailTemplate>
  )
}

export default ProductInsightInsightsReadyEmail
