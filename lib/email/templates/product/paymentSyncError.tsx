import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export type PaymentSyncErrorEmailProps = {
  ownerName?: string | null
  productName: string
  editUrl: string
  errorMessage?: string | null
}

const paragraphStyle = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#1f2937",
} as const

const highlightStyle = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: "10px",
  backgroundColor: "#f1f5f9",
  color: "#0f172a",
  fontWeight: 600,
  fontSize: "14px",
  marginBottom: "16px",
} as const

export default function PaymentSyncErrorEmail({
  ownerName,
  productName,
  editUrl,
  errorMessage,
}: PaymentSyncErrorEmailProps) {
  const headingPrefix = ownerName ? `${ownerName}, ` : ""

  return (
    <BaseEmailTemplate
      title={`Fix ${productName} revenue sync`}
      previewText={`We couldn't sync revenue for ${productName}. Update your payment connection.`}
      heading={`${headingPrefix}we couldn't sync ${productName}'s revenue`}
      intro={`We hit an issue while syncing revenue for ${productName}. Update your payment connection so we can keep your numbers fresh.`}
      cta={{ label: "Fix payment connection", href: editUrl }}
    >
      {errorMessage ? (
        <p style={highlightStyle}>
          Latest error: <span style={{ fontWeight: 700 }}>{errorMessage}</span>
        </p>
      ) : null}

      <p style={paragraphStyle}>
        Open your product settings to refresh the payment credentials or account
        details, then re-run the sync to resume revenue tracking.
      </p>
    </BaseEmailTemplate>
  )
}
