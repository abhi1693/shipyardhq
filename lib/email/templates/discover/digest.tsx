import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { EMAIL_BRAND } from "@/lib/email/brand"

export type DigestProduct = {
  name: string
  tagline: string
  url: string
  category?: string | null
  publishedAt?: Date | null
}

export type DiscoverDigestEmailProps = {
  weekStart: Date
  weekEnd: Date
  featured: DigestProduct[]
  freshLaunches: DigestProduct[]
  trending: DigestProduct[]
  ctaUrl: string
}

const paragraphStyle = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#1f2937",
} as const

const sectionHeadingStyle = {
  fontSize: "18px",
  lineHeight: "26px",
  fontWeight: 600,
  margin: "24px 0 12px",
  color: "#0f172a",
} as const

const listItemStyle = {
  padding: "16px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  marginBottom: "12px",
  backgroundColor: "#f9fafb",
} as const

const productNameStyle = {
  fontSize: "16px",
  fontWeight: 600,
  margin: "0 0 4px",
  color: "#0f172a",
} as const

const taglineStyle = {
  margin: "0 0 8px",
  fontSize: "14px",
  lineHeight: "22px",
  color: "#374151",
} as const

const metaStyle = {
  display: "flex",
  gap: "12px",
  fontSize: "12px",
  color: "#6b7280",
} as const

const linkStyle = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 500,
} as const

function formatDateRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  })
  return `${fmt.format(start)} — ${fmt.format(end)}`
}

function formatPublishedAt(date?: Date | null) {
  if (!date) return null
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date)
  } catch {
    return null
  }
}

function renderProductList(items: DigestProduct[], emptyText: string) {
  if (!items.length) {
    return <p style={paragraphStyle}>{emptyText}</p>
  }

  return (
    <div>
      {items.map((item) => {
        const published = formatPublishedAt(item.publishedAt ?? undefined)
        return (
          <div key={item.url} style={listItemStyle}>
            <p style={productNameStyle}>
              <a href={item.url} style={linkStyle}>
                {item.name}
              </a>
            </p>
            <p style={taglineStyle}>{item.tagline}</p>
            <div style={metaStyle}>
              {item.category ? <span>{item.category}</span> : null}
              {published ? <span>Launched {published}</span> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DiscoverDigestEmail({
  weekStart,
  weekEnd,
  featured,
  freshLaunches,
  trending,
  ctaUrl,
}: DiscoverDigestEmailProps) {
  const range = formatDateRange(weekStart, weekEnd)

  return (
    <BaseEmailTemplate
      title={`Discover what's new (${range})`}
      previewText={`This week on ${EMAIL_BRAND.name}: featured upgrades, trending picks, and new launches.`}
      heading={`This week on ${EMAIL_BRAND.name}`}
      intro={`Featured upgrades, trending standouts, and fresh launches between ${range}.`}
      cta={{ label: "Browse all products", href: ctaUrl }}
    >
      {featured.length > 0 ? (
        <>
          <h2 style={sectionHeadingStyle}>Featured upgrades</h2>
          {renderProductList(
            featured,
            "No featured upgrades this week—upgrade your listing to sail into the digest.",
          )}
        </>
      ) : null}

      <h2 style={sectionHeadingStyle}>Trending now</h2>
      {renderProductList(
        trending,
        "No major movers yet. Bookmark Shipyard HQ to catch next week's highlights.",
      )}

      <h2 style={sectionHeadingStyle}>New launches</h2>
      {renderProductList(
        freshLaunches,
        "No new launches this week—stay tuned for next week's digest!",
      )}

      <p style={paragraphStyle}>
        Want your product featured here? Submit your launch or upgrade for more
        visibility.
      </p>
    </BaseEmailTemplate>
  )
}

export default DiscoverDigestEmail
