import type { CSSProperties } from "react"

import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { MEMBER_PRODUCTS_PATH } from "@/lib/routes"

export const BUILDER_OUTREACH_SUBJECT =
  "Shipyard team ready to help you launch with confidence"
export const BUILDER_OUTREACH_PREVIEW_TEXT =
  "Prep with guided checklists, expert review, and weekly insights."
export const BUILDER_OUTREACH_CTA_URL = `https://shipyardhq.dev${MEMBER_PRODUCTS_PATH}`

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

const footerParagraphStyle: CSSProperties = {
  ...paragraphStyle,
  marginTop: "24px",
}

type BuilderOutreachEmailProps = {
  firstName?: string | null
  renderMode?: "document" | "preview"
}

function getGreeting(firstName?: string | null): string {
  const trimmed = firstName?.trim()
  if (trimmed && trimmed.length > 0) {
    return trimmed
  }
  return "there"
}

export function BuilderOutreachEmail({
  firstName,
  renderMode,
}: BuilderOutreachEmailProps) {
  const greeting = getGreeting(firstName)

  return (
    <BaseEmailTemplate
      renderMode={renderMode}
      title={BUILDER_OUTREACH_SUBJECT}
      previewText={BUILDER_OUTREACH_PREVIEW_TEXT}
      heading="Launch with support you can trust"
      intro={`Hey ${greeting}, I'm part of the Shipyard team. We're here to help you fine-tune your launch story and feel confident when you share it.`}
      cta={{ label: "Start your listing", href: BUILDER_OUTREACH_CTA_URL }}
      footerNote={<BuilderOutreachSignature />}
    >
      <p style={paragraphStyle}>
        Shipyard pairs your launch with hands-on guidance. Submit when
        you&#39;re ready and we&#39;ll help you gather the essentials, polish
        your listing, and share it with builders, operators, and investors who
        care about what&#39;s next.
      </p>
      <ul style={listStyle}>
        <li>
          Work through guided checklists, templates, and examples so your
          listing hits the moments people expect.
        </li>
        <li>
          Share updates at your pace; when you&#39;re ready we can spotlight you
          across the homepage, editorial newsletters, and community features.
        </li>
        <li>
          Review plan-specific analytics to understand what resonates and which
          channels to lean on next.
        </li>
        <li>
          Get weekly Shipyard Insights distilling performance data, competitor
          research, and community sentiment into next steps.
        </li>
      </ul>
      <p style={paragraphStyle}>
        Whether you&#39;re polishing your first draft or iterating after launch,
        we stay alongside you with steady reminders and practical data.
      </p>
      <p style={paragraphStyle}>
        Want a walkthrough or have questions? Just reply and we&#39;ll connect
        you with someone from the team.
      </p>
    </BaseEmailTemplate>
  )
}

function BuilderOutreachSignature() {
  return (
    <div style={footerParagraphStyle}>
      <p style={paragraphStyle}>All the best,</p>
      <p style={paragraphStyle}>
        Shipyard Team - Shipyard HQ
        <br />
        <a
          href="https://shipyardhq.dev"
          style={{ color: "#2563eb", textDecoration: "none" }}
        >
          shipyardhq.dev
        </a>
      </p>
    </div>
  )
}

export function buildBuilderOutreachTextBody(firstName?: string | null) {
  const greeting = getGreeting(firstName)

  const lines = [
    `Hey ${greeting}, I'm part of the Shipyard team. We're here to help you fine-tune your launch story and feel confident when you share it.`,
    "",
    "Shipyard pairs your launch with hands-on guidance. Submit when you're ready and we'll help you gather the essentials, polish your listing, and share it with builders, operators, and investors who care about what's next.",
    "",
    "Here's how we help:",
    "- Work through guided checklists, templates, and examples so your listing hits the moments people expect.",
    "- Share updates at your pace; when you're ready we can spotlight you across the homepage, editorial newsletters, and community features.",
    "- Review plan-specific analytics to understand what resonates and which channels to lean on next.",
    "- Get weekly Shipyard Insights distilling performance data, competitor research, and community sentiment into next steps.",
    "",
    "Whether you're polishing your first draft or iterating after launch, we stay alongside you with steady reminders and practical data.",
    `Start here: ${BUILDER_OUTREACH_CTA_URL}`,
    "",
    "Want a walkthrough or have questions? Just reply and we'll connect you with someone from the team.",
    "",
    "All the best,",
    "Shipyard Team - Shipyard HQ",
    "https://shipyardhq.dev",
  ]

  return lines.join("\n")
}
