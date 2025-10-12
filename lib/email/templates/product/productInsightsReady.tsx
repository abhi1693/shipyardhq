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
      title={`New insights for ${productName}`}
      previewText={`Latest signals and guidance are ready for ${productName}.`}
      heading={`${productName} insights are ready`}
      intro="We just wrapped the latest analysis. Take a few minutes to check what changed and the opportunities worth acting on."
      cta={{ label: "See the full insight report", href: insightsUrl }}
    >
      <p style={paragraphStyle}>
        Inside your dashboard you&apos;ll see an at-a-glance summary of how
        interest is trending and where attention is concentrating.
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
          <strong>Recommended next moves</strong> tailored to keep your team
          focused on the highest-impact work.
        </li>
      </ul>

      <p style={paragraphStyle}>
        Review the highlights while the insights are current so you can respond
        before competitors notice the same signals. We&apos;ll send another
        update as soon as the next analysis is complete.
      </p>
    </BaseEmailTemplate>
  )
}

export default ProductInsightInsightsReadyEmail
