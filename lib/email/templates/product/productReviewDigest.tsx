import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type ProductReviewDigestEmailProps = {
  ownerName: string
  periodStart: Date
  periodEnd: Date
  products: Array<{
    name: string
    averageRating: number
    totalReviews: number
    productUrl: string
    dashboardUrl: string
    reviews: Array<{
      id: string
      rating: number
      message: string
      reviewerName: string
      createdAt: Date
    }>
  }>
}

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
  margin: "0 0 16px",
} as const

const productHeader = {
  margin: "0 0 12px",
  padding: "16px 20px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
} as const

const reviewCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "16px",
  margin: "0 0 12px",
  backgroundColor: "#ffffff",
} as const

const label = {
  fontSize: "12px",
  letterSpacing: "0.08em",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  marginBottom: "4px",
}

const productLinks = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap" as const,
  marginTop: "12px",
}

const linkStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  borderRadius: "20px",
  border: "1px solid #d1d5db",
  textDecoration: "none",
  fontSize: "13px",
  color: "#2563eb",
  backgroundColor: "#f1f5f9",
} as const

const reviewerNameStyle = {
  fontWeight: 600,
  fontSize: "14px",
  color: "#111827",
  marginBottom: "4px",
} as const

const reviewMessageStyle = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#1f2937",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
}

const reviewMetaStyle = {
  fontSize: "12px",
  color: "#6b7280",
  marginTop: "8px",
} as const

function formatRange(start: Date, end: Date) {
  try {
    const startFmt = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    const endFmt = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    return `${startFmt} – ${endFmt}`
  } catch {
    return "Past 24 hours"
  }
}

function formatDate(value: Date) {
  try {
    return value.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return "Recently"
  }
}

function formatRating(rating: number) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)))
  const stars = "★".repeat(clamped)
  const empty = "☆".repeat(5 - clamped)
  return `${stars}${empty}`
}

export default function ProductReviewDigestEmail({
  ownerName,
  periodStart,
  periodEnd,
  products,
}: ProductReviewDigestEmailProps) {
  return (
    <BaseEmailTemplate
      title="Daily product reviews"
      previewText="Check the new feedback your Shipyard listing received."
      heading={`Hi ${ownerName || "there"}, new reviews just arrived.`}
      intro={`Here's what customers shared between ${formatRange(periodStart, periodEnd)}.`}
    >
      {products.map((product) => (
        <div key={product.name} style={{ marginBottom: "28px" }}>
          <div style={productHeader}>
            <div style={label}>Product</div>
            <div
              style={{ fontSize: "18px", fontWeight: 600, color: "#0f172a" }}
            >
              {product.name}
            </div>
            <div
              style={{ fontSize: "13px", color: "#475569", marginTop: "6px" }}
            >
              {`${product.totalReviews} total reviews · Avg rating ${product.averageRating.toFixed(1)}/5`}
            </div>
            <div style={productLinks}>
              <a href={product.productUrl} style={linkStyle}>
                View public page →
              </a>
              <a href={product.dashboardUrl} style={linkStyle}>
                Open dashboard →
              </a>
            </div>
          </div>

          {product.reviews.map((review) => (
            <div key={review.id} style={reviewCard}>
              <div style={reviewerNameStyle}>{review.reviewerName}</div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#f59e0b",
                  marginBottom: "6px",
                }}
              >
                {formatRating(review.rating)}
              </div>
              <p style={reviewMessageStyle}>{review.message}</p>
              <div style={reviewMetaStyle}>{formatDate(review.createdAt)}</div>
            </div>
          ))}

          {!product.reviews.length && (
            <p style={paragraph}>No new reviews in this window.</p>
          )}
        </div>
      ))}

      <p style={paragraph}>
        Keep the conversation going by replying to reviewers or sharing your
        updates on the public page.
      </p>
    </BaseEmailTemplate>
  )
}
