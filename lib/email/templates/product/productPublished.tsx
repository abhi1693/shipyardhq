import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { EMAIL_BRAND } from "@/lib/email/brand"

export type ProductPublishedEmailProps = {
  productName: string
  productUrl: string
  dashboardUrl: string
  publishedAt?: Date
  shareUrl?: string
  planName?: string | null
}

const paragraphStyle = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#1f2937",
} as const

const listStyle = {
  paddingLeft: "20px",
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
} as const

const linkStyle = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 500,
} as const

function formatDate(value?: Date) {
  if (!value) return ""
  try {
    return value.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    })
  } catch {
    return ""
  }
}

export function ProductPublishedEmail({
  productName,
  productUrl,
  dashboardUrl,
  publishedAt,
  shareUrl,
  planName,
}: ProductPublishedEmailProps) {
  const publishedTimestamp = formatDate(publishedAt)

  return (
    <BaseEmailTemplate
      title={`${productName} is live`}
      previewText={`${productName} just launched on ${EMAIL_BRAND.name}.`}
      heading={`${productName} is now live!`}
      intro="Your launch is officially public. Here's how to make the most of the first wave of traffic."
      cta={{ label: "Open your launch dashboard", href: dashboardUrl }}
    >
      {publishedTimestamp ? (
        <p style={paragraphStyle}>Published: {publishedTimestamp}</p>
      ) : null}

      <p style={paragraphStyle}>
        Share your product page with your community:
        <br />
        <a href={productUrl} style={linkStyle}>
          {productUrl}
        </a>
      </p>

      <p style={paragraphStyle}>Recommended next steps:</p>
      <ol style={listStyle}>
        <li>Announce the launch on Twitter/X, LinkedIn, and your mailing list.</li>
        <li>Ask early adopters to upvote and leave feedback on Shipyard HQ.</li>
        <li>
          Monitor analytics in your dashboard to watch clicks and upvotes roll in.
        </li>
      </ol>

      {planName ? (
        <p style={paragraphStyle}>
          Your current plan: <strong>{planName}</strong>. Upgrade anytime for
          homepage placement, newsletter promotion, and more visibility.
        </p>
      ) : null}

      {shareUrl ? (
        <p style={paragraphStyle}>
          Need assets? Grab social previews and badges here: {" "}
          <a href={shareUrl} style={linkStyle}>
            Launch asset kit
          </a>
          .
        </p>
      ) : null}

      <p style={paragraphStyle}>
        We&apos;re cheering you on. Reply if you need help or want a signal boost!
      </p>
    </BaseEmailTemplate>
  )
}

export default ProductPublishedEmail
