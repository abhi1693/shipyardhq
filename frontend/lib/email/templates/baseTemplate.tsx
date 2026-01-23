import type { ReactNode } from "react"
import { EmailLayout } from "@/lib/email/components/layout"

export type BaseEmailTemplateProps = {
  heading?: string
  intro?: string
  children?: ReactNode
  cta?: { label: string; href: string }
  previewText?: string
  title?: string
  showHeader?: boolean
  renderMode?: "document" | "preview"
  footerNote?: ReactNode
}

const headingStyle = {
  fontSize: "22px",
  lineHeight: "28px",
  fontWeight: 600,
  margin: "0 0 16px",
  color: "#0f172a",
} as const

const paragraphStyle = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#1f2937",
} as const

const buttonWrapperStyle = {
  marginTop: "24px",
  marginBottom: "24px",
} as const

const buttonStyle = {
  display: "inline-block",
  padding: "12px 20px",
  borderRadius: "8px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "15px",
  textDecoration: "none",
} as const

/**
 * Standard layout with heading, intro paragraph, and optional CTA button.
 */
export function BaseEmailTemplate({
  heading,
  intro,
  children,
  cta,
  previewText,
  title,
  showHeader,
  renderMode,
  footerNote,
}: BaseEmailTemplateProps) {
  return (
    <EmailLayout
      previewText={previewText}
      title={title}
      showHeader={showHeader}
      renderMode={renderMode}
    >
      {heading ? <h1 style={headingStyle}>{heading}</h1> : null}
      {intro ? <p style={paragraphStyle}>{intro}</p> : null}
      {children}
      {footerNote ? footerNote : null}
      {cta ? (
        <div style={buttonWrapperStyle}>
          <a href={cta.href} style={buttonStyle}>
            {cta.label}
          </a>
        </div>
      ) : null}
    </EmailLayout>
  )
}
