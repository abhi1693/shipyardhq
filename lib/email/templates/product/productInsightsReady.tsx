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

export function ProductInsightInsightsReadyEmail({
  productName,
  insightsUrl,
}: ProductInsightInsightsReadyEmailProps) {
  return (
    <BaseEmailTemplate
      title={`${productName} insights refreshed`}
      previewText={`Log in to review the latest signals for ${productName}.`}
      heading={`${productName} insights are ready`}
      intro="We just refreshed your discovery run. The complete breakdown lives inside your Shipyard dashboard."
      cta={{ label: "View the insights dashboard", href: insightsUrl }}
    >
      <p style={paragraphStyle}>
        Log in to explore the newest intelligence, including status across each
        stage, emerging conversations, and priority actions for your team.
      </p>

      <p style={paragraphStyle}>
        We will keep emailing you when fresh insight passes are ready so you
        never miss new signals. Everything else is waiting for you in Shipyard.
      </p>
    </BaseEmailTemplate>
  )
}

export default ProductInsightInsightsReadyEmail
