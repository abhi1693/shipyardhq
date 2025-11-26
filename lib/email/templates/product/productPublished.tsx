/* eslint-disable @next/next/no-img-element */
import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { EMAIL_BRAND } from "@/lib/email/brand"

export type ProductPublishedEmailProps = {
  productName: string
  productUrl: string
  dashboardUrl: string
  productSlug: string
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

const badgeSectionStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "20px",
  margin: "24px 0",
  backgroundColor: "#f9fafb",
} as const

const badgeTableStyle = {
  width: "100%",
} as const

const badgeCellStyle = {
  textAlign: "center",
  padding: "8px",
} as const

const badgeImageStyle = {
  display: "block",
  width: "100%",
  maxWidth: "220px",
  height: "auto",
  borderRadius: "8px",
  margin: "0 auto",
} as const

const badgeLabelStyle = {
  marginTop: "8px",
  fontSize: "13px",
  color: "#4b5563",
} as const

const codeBlockStyle = {
  backgroundColor: "#111827",
  color: "#f9fafb",
  fontSize: "12px",
  lineHeight: "18px",
  padding: "12px",
  borderRadius: "8px",
  margin: "12px 0 0",
  fontFamily:
    "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
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
  productSlug,
  publishedAt,
  shareUrl,
  planName,
}: ProductPublishedEmailProps) {
  const badgeType: "featured" | "revenue" = "revenue"
  const publishedTimestamp = formatDate(publishedAt)
  const assetBaseUrl = EMAIL_BRAND.homeUrl.replace(/\/$/, "")
  const buildBadgeUrl = (
    theme: "light" | "dark",
    format: "svg" | "png" = "svg",
  ) => {
    const url = new URL(`/api/embed/products/${productSlug}`, assetBaseUrl)
    url.searchParams.set("type", badgeType)
    url.searchParams.set("theme", theme)
    if (format === "png") {
      url.searchParams.set("format", "png")
    }
    return url.toString()
  }

  const badgeLightUrl = buildBadgeUrl("light", "png")
  const badgeDarkUrl = buildBadgeUrl("dark", "png")
  const badgeEmbedUrl = buildBadgeUrl("light")
  const badgeSnippet = `<a href="${productUrl}" target="_blank" rel="noopener">\n  <img src="${badgeEmbedUrl}" alt="${EMAIL_BRAND.name} badge" style="max-width: 500px;" />\n</a>`

  return (
    <BaseEmailTemplate
      title={`${productName} is live`}
      previewText={`${productName} just launched on ${EMAIL_BRAND.name}.`}
      heading={`${productName} is now live!`}
      intro="Your launch is officially public. Here's how to make the most of the first wave of traffic."
      cta={{ label: "Open your launch dashboard", href: dashboardUrl }}
    >
      {Boolean(publishedTimestamp) && (
        <p style={paragraphStyle}>Published: {publishedTimestamp}</p>
      )}

      <p style={paragraphStyle}>
        Share your product page with your community:
        <br />
        <a href={productUrl} style={linkStyle}>
          {productUrl}
        </a>
      </p>

      <p style={paragraphStyle}>Recommended next steps:</p>
      <ol style={listStyle}>
        <li>
          Announce the launch on Twitter/X, LinkedIn, and your mailing list.
        </li>
        <li>Ask early adopters to upvote and leave feedback on Shipyard HQ.</li>
        <li>
          Monitor analytics in your dashboard to watch clicks and upvotes roll
          in.
        </li>
      </ol>

      <div style={badgeSectionStyle}>
        <p style={paragraphStyle}>
          Add the live <strong>Shipyard badge</strong> from our embed API so it
          stays in sync with your stats. Link it to your product so visitors can
          discover you on {EMAIL_BRAND.name}.
        </p>
        <p style={paragraphStyle}>
          The previews below render directly from the API (no static assets). Use
          whichever theme fits your site; the embed stays up to date
          automatically.
        </p>
        <table style={badgeTableStyle} cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td style={badgeCellStyle}>
                <a href={badgeLightUrl} style={linkStyle}>
                  <img
                    src={badgeLightUrl}
                    alt="Shipyard badge API preview for light backgrounds"
                    style={badgeImageStyle}
                    width={220}
                    height={71}
                  />
                </a>
                <div style={badgeLabelStyle}>Light backgrounds</div>
              </td>
              <td style={badgeCellStyle}>
                <a href={badgeDarkUrl} style={linkStyle}>
                  <img
                    src={badgeDarkUrl}
                    alt="Shipyard badge API preview for dark backgrounds"
                    style={badgeImageStyle}
                    width={220}
                    height={71}
                  />
                </a>
                <div style={badgeLabelStyle}>Dark backgrounds</div>
              </td>
            </tr>
          </tbody>
        </table>
        <p style={paragraphStyle}>
          Paste this snippet wherever you want the badge to appear:
        </p>
        <pre style={codeBlockStyle}>{badgeSnippet}</pre>
      </div>

      {Boolean(planName) && (
        <p style={paragraphStyle}>
          Your current plan: <strong>{planName}</strong>. Upgrade anytime for
          sponsored placements, newsletter promotion, and more visibility.
        </p>
      )}

      {Boolean(shareUrl) && (
        <p style={paragraphStyle}>
          Need assets? Grab social previews and badges here:{" "}
          <a href={shareUrl} style={linkStyle}>
            Launch asset kit
          </a>
          .
        </p>
      )}

      <p style={paragraphStyle}>We&apos;re cheering you on.</p>
    </BaseEmailTemplate>
  )
}

export default ProductPublishedEmail
