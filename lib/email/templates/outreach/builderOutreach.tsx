import type { CSSProperties } from "react"

import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { MEMBER_PRODUCTS_PATH } from "@/lib/routes"

export const BUILDER_OUTREACH_SUBJECT =
  "Launch without the wait: Shipyard now pairs curated discovery with weekly insights"
export const BUILDER_OUTREACH_PREVIEW_TEXT =
  "Submit today to tap crew-reviewed exposure, weekly intelligence, and plan-level analytics."
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
      heading="Launch without the wait"
      intro={`Hey ${greeting}, I'm part of the Shipyard crew. We built Shipyard for builders who want momentum without the noise.`}
      cta={{ label: "Start your listing", href: BUILDER_OUTREACH_CTA_URL }}
      footerNote={<BuilderOutreachSignature />}
    >
      <p style={paragraphStyle}>
        Shipyard gives every launch a crew-reviewed runway. Submit when you&#39;re
        ready and the team pairs your product with checklists, templates, and a
        curated community of builders, investors, and operators actively
        looking for what&#39;s next.
      </p>
      <ul style={listStyle}>
        <li>
          Launch instantly with no queues or pay-to-play fast passes, and keep
          your crew aligned with built-in prep tools.
        </li>
        <li>
          Stay in the spotlight with homepage showcases, editorial newsletters,
          and leaderboard boosts you can unlock on your terms.
        </li>
        <li>
          See what converts using plan-specific analytics that track views,
          referrers, devices, retention, and organization-wide rollups.
        </li>
        <li>
          Turn signal into strategy with Shipyard Insights; every plan starts
          with a weekly report blending performance data, competitor research,
          and community sentiment.
        </li>
        <li>
          Scout what&#39;s trending next with the interactive Trend Radar pointing
          to categories where momentum and upvotes are surging.
        </li>
      </ul>
      <p style={paragraphStyle}>
        You can start free, upgrade placements only when you want extra reach,
        and keep momentum compounding long after launch day.
      </p>
      <p style={paragraphStyle}>
        Have questions or want a second set of eyes on your listing? Just reply
        and I&#39;ll make sure you&#39;re set.
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
    `Hey ${greeting}, I'm part of the Shipyard crew. We built Shipyard for builders who want momentum without the noise.`,
    "",
    "Shipyard gives every launch a crew-reviewed runway. Submit when you're ready and the team pairs your product with prep tools plus a curated audience of builders, investors, and operators actively looking for what's next.",
    "",
    "Here's what you unlock:",
    "- Launch instantly with no queues or pay-to-play fast passes, and keep your crew aligned with built-in prep tools.",
    "- Stay in the spotlight with homepage showcases, editorial newsletters, and leaderboard boosts you can unlock on your terms.",
    "- See what converts using analytics that track views, referrers, devices, retention, and organization-wide rollups.",
    "- Turn signal into strategy with Shipyard Insights; every plan starts with a weekly report blending performance data, competitor research, and community sentiment.",
    "- Scout what's trending next with the interactive Trend Radar highlighting categories where momentum and upvotes are surging.",
    "",
    "You can start free, upgrade placements only when you want extra reach, and keep momentum compounding long after launch day.",
    `Start here: ${BUILDER_OUTREACH_CTA_URL}`,
    "",
    "Have questions or want a second set of eyes on your listing? Just reply and I'll make sure you're set.",
    "",
    "Fair winds,",
    "Shipyard Crew - Shipyard HQ",
    "https://shipyardhq.dev",
  ]

  return lines.join("\n")
}
