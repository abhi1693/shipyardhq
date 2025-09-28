import type { CSSProperties } from "react"

import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type ProductIdeaInsightsReadyEmailProps = {
  productName: string
  insightsUrl: string
  highlightCount: number
  communityCount: number
  threadCount: number
  highlightPoints: string[]
  summary?: string | null
}

const paragraphStyle: CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#1f2937",
}

const listStyle: CSSProperties = {
  paddingLeft: "20px",
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
}

const summaryBlockStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  padding: "16px",
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
}

const metricListStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  margin: "0 0 20px",
  padding: "0",
  listStyle: "none",
}

const metricItemStyle: CSSProperties = {
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#f8fafc",
  padding: "12px 14px",
}

const metricLabelStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  margin: "0 0 6px",
}

const metricValueStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#0f172a",
  margin: 0,
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <li style={metricItemStyle}>
      <p style={metricLabelStyle}>{label}</p>
      <p style={metricValueStyle}>{value}</p>
    </li>
  )
}

function renderHighlights(highlights: string[]) {
  if (!highlights.length) return null
  return (
    <ul style={listStyle}>
      {highlights.map((point, index) => (
        <li key={`highlight-${index}`}>{point}</li>
      ))}
    </ul>
  )
}

function renderSummary(summary?: string | null) {
  if (!summary) return null
  return <div style={summaryBlockStyle}>{summary}</div>
}

export function ProductIdeaInsightsReadyEmail({
  productName,
  insightsUrl,
  highlightCount,
  communityCount,
  threadCount,
  highlightPoints,
  summary,
}: ProductIdeaInsightsReadyEmailProps) {
  return (
    <BaseEmailTemplate
      title={`${productName} insights ready`}
      previewText={`We refreshed Reddit intelligence for ${productName}.`}
      heading={`${productName} insights are ready`}
      intro="We ran the full Shipyard discovery pipeline and combined product narrative, Reddit communities, and live discussions into a single report."
      cta={{ label: "Open the insights report", href: insightsUrl }}
    >
      <p style={paragraphStyle}>
        Here is a quick snapshot of what changed in this pass:
      </p>

      <ul style={metricListStyle}>
        <Metric
          label="Key takeaways"
          value={`${highlightCount} headline${highlightCount === 1 ? "" : "s"}`}
        />
        <Metric
          label="Saved communities"
          value={`${communityCount}`}
        />
        <Metric
          label="Discussion threads"
          value={`${threadCount}`}
        />
      </ul>

      {renderSummary(summary)}

      {highlightPoints.length ? (
        <>
          <p style={paragraphStyle}>
            Top highlights waiting in your report:
          </p>
          {renderHighlights(highlightPoints)}
        </>
      ) : null}

      <p style={paragraphStyle}>
        Dive into the dashboard to review the full action plan, customer
        signals, and opportunity areas. We will keep this report fresh every
        time you run the pipeline.
      </p>
    </BaseEmailTemplate>
  )
}

export default ProductIdeaInsightsReadyEmail

