import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type DomainVerificationReminderProps = {
  productName: string
  verificationCode: string
  dashboardUrl: string
  docsUrl?: string
}

const listStyle = {
  paddingLeft: "20px",
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1f2937",
} as const

const codeStyle = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: "6px",
  backgroundColor: "#f3f4f6",
  border: "1px solid #e5e7eb",
  fontFamily: "'JetBrains Mono', 'Menlo', monospace",
  fontSize: "13px",
  color: "#111827",
} as const

const paragraphStyle = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#1f2937",
} as const

export function DomainVerificationReminderEmail({
  productName,
  verificationCode,
  dashboardUrl,
  docsUrl = "https://shipyardhq.com/docs/launch/verification",
}: DomainVerificationReminderProps) {
  return (
    <BaseEmailTemplate
      title={`Verify ${productName}`}
      previewText={`Finish domain verification for ${productName} to unlock trust badges.`}
      heading={`Let’s verify ${productName}`}
      intro="Your launch is live, but visitors still see the unverified badge. Add the TXT record below so we can confirm you own the domain."
      cta={{ label: "Open product settings", href: dashboardUrl }}
    >
      <p style={paragraphStyle}>Here’s the DNS record to add at your domain host:</p>
      <table
        width="100%"
        cellPadding={12}
        cellSpacing={0}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          marginBottom: "20px",
        }}
      >
        <tbody>
          <tr>
            <td style={{ width: "30%", fontWeight: 600 }}>Type</td>
            <td>TXT</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Host / Name</td>
            <td>@ (or your root domain)</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Value</td>
            <td>
              <span style={codeStyle}>{verificationCode}</span>
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>TTL</td>
            <td>5 minutes (or default)</td>
          </tr>
        </tbody>
      </table>

      <p style={paragraphStyle}>Quick checklist:</p>
      <ol style={listStyle}>
        <li>Add the TXT record to your DNS provider.</li>
        <li>Wait a few minutes for the record to propagate.</li>
        <li>
          Visit your product settings and click <strong>Verify domain</strong>.
        </li>
      </ol>

      <p style={paragraphStyle}>
        Need a walkthrough? We put together a short guide here: {" "}
        <a
          href={docsUrl}
          style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
        >
          Domain verification help
        </a>
        .
      </p>

      <p style={paragraphStyle}>
        Once verified we’ll automatically remove the warning badge, boost trust, and
        surface the product in more curated feeds.
      </p>
    </BaseEmailTemplate>
  )
}

export default DomainVerificationReminderEmail
