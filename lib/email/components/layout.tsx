/* eslint-disable @next/next/no-head-element, @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react"
import { EMAIL_BRAND } from "@/lib/email/brand"

export type EmailLayoutProps = {
  children: ReactNode
  previewText?: string
  title?: string
}

const bodyStyle: CSSProperties = {
  margin: "0",
  padding: "0",
  backgroundColor: "#f5f5f5",
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: "#111827",
}

const containerStyle: CSSProperties = {
  width: "100%",
  paddingTop: "32px",
  paddingBottom: "32px",
}

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "600px",
  borderRadius: "12px",
  overflow: "hidden",
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
}

const contentCellStyle: CSSProperties = {
  padding: "32px",
}

const headerCellStyle: CSSProperties = {
  padding: "24px 32px 16px",
  backgroundColor: "#0f172a",
  color: "#f8fafc",
}

const footerCellStyle: CSSProperties = {
  padding: "24px 32px",
  backgroundColor: "#f8fafc",
  fontSize: "12px",
  color: "#6b7280",
}

const previewStyle: CSSProperties = {
  display: "none",
  fontSize: "1px",
  color: "#f5f5f5",
  lineHeight: "1px",
  maxHeight: "0",
  maxWidth: "0",
  opacity: 0,
  overflow: "hidden",
}

const linkStyle: CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
}

export function EmailLayout({
  children,
  previewText,
  title,
}: EmailLayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title ?? EMAIL_BRAND.name}</title>
      </head>
      <body style={bodyStyle}>
        {previewText ? <div style={previewStyle}>{previewText}</div> : null}
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={containerStyle}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={cardStyle}
                >
                  <tbody>
                    <EmailHeader />
                    <tr>
                      <td style={contentCellStyle}>{children}</td>
                    </tr>
                    <EmailFooter />
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}

export function EmailHeader() {
  return (
    <tr>
      <td style={headerCellStyle}>
        <a
          href={EMAIL_BRAND.homeUrl}
          style={{
            color: "inherit",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "18px",
            display: "inline-flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {EMAIL_BRAND.logoUrl ? (
            <img
              src={EMAIL_BRAND.logoUrl}
              alt={EMAIL_BRAND.logoAlt}
              width="32"
              height="32"
              style={{ borderRadius: "8px", display: "block" }}
            />
          ) : null}
          <span>{EMAIL_BRAND.name}</span>
        </a>
      </td>
    </tr>
  )
}

export function EmailFooter() {
  return (
    <tr>
      <td style={footerCellStyle}>
        <div>{EMAIL_BRAND.name}</div>
        <div style={{ marginTop: "8px" }}>
          Questions? Reach us at{" "}
          <a href={`mailto:${EMAIL_BRAND.supportEmail}`} style={linkStyle}>
            {EMAIL_BRAND.supportEmail}
          </a>
          .
        </div>
        <div style={{ marginTop: "4px" }}>
          Follow updates on{" "}
          <a href={EMAIL_BRAND.twitterUrl} style={linkStyle}>
            X
          </a>
          .
        </div>
      </td>
    </tr>
  )
}
