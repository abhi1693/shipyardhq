import type { CSSProperties } from "react"

import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { MEMBER_PRODUCTS_PATH } from "@/lib/routes"

export const BUILDER_OUTREACH_SUBJECT = "Launch with momentum on Shipyard HQ"
export const BUILDER_OUTREACH_PREVIEW_TEXT =
  "Showcase your product, earn curated visibility, and track builder engagement."
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
      heading="Launch with momentum on Shipyard HQ"
      intro={`Hey ${greeting}, I'm part of the Shipyard HQ crew. We built Shipyard so indie makers can launch with momentum, gather feedback, and grow alongside fellow builders.`}
      cta={{ label: "List your product", href: BUILDER_OUTREACH_CTA_URL }}
      footerNote={<BuilderOutreachSignature />}
    >
      <p style={paragraphStyle}>
        Shipyard is where indie products earn signal without shouting. A
        polished launch profile anchors your product while the crew spotlights
        it across a network of builders, investors, and early champions.
      </p>
      <ul style={listStyle}>
        <li>
          List your product in minutes with story, media, and stack details.
        </li>
        <li>
          Stay top of mind with changelog drops and weekly featured roundups.
        </li>
        <li>
          Track engagement with Shipyard analytics covering views, follows, and
          clicks.
        </li>
      </ul>
      <p style={paragraphStyle}>
        We are hand-inviting early crews whose work we admire, and listing is
        free while taking under five minutes to get live.
      </p>
      <p style={paragraphStyle}>
        Have questions or want a second set of eyes on your launch copy? Just
        reply to this email and I will personally help out.
      </p>
    </BaseEmailTemplate>
  )
}

function BuilderOutreachSignature() {
  return (
    <div style={footerParagraphStyle}>
      <p style={paragraphStyle}>Fair winds,</p>
      <p style={paragraphStyle}>
        Shipyard Crew - Shipyard HQ
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
    `Hey ${greeting}, I'm part of the Shipyard HQ crew. We built Shipyard so indie makers can launch with momentum, gather feedback, and grow alongside fellow builders.`,
    "",
    "Shipyard is where indie products earn signal without shouting. A polished launch profile anchors your product while the crew spotlights it across a network of builders, investors, and early champions.",
    "",
    "Here is what you can do once aboard:",
    "- List your product in minutes with story, media, and stack details.",
    "- Stay top of mind with changelog drops and weekly featured roundups.",
    "- Track engagement with Shipyard analytics covering views, follows, and clicks.",
    "",
    "We are hand-inviting early crews whose work we admire, and listing is free while taking under five minutes to get live.",
    `Start here: ${BUILDER_OUTREACH_CTA_URL}`,
    "",
    "Have questions or want a second set of eyes on your launch copy? Just reply to this email and I will personally help out.",
    "",
    "Fair winds,",
    "Shipyard Crew - Shipyard HQ",
    "https://shipyardhq.dev",
  ]

  return lines.join("\n")
}
