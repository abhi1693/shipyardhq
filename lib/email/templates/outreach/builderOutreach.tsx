import type { CSSProperties } from "react"

import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

export const BUILDER_OUTREACH_SUBJECT =
  "Showcase your next launch on Shipyard HQ"
export const BUILDER_OUTREACH_PREVIEW_TEXT =
  "List your product, tell the story, and grow with fellow indie builders."
export const BUILDER_OUTREACH_CTA_URL =
  "https://shipyardhq.dev/member/products"

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
      heading="Bring your next launch aboard Shipyard HQ"
      intro={`Hey ${greeting}, my name is Abhimanyu from Shipyard HQ. We are building a harbor for indie makers to launch, learn, and swap feedback together.`}
      cta={{ label: "List your product", href: BUILDER_OUTREACH_CTA_URL }}
      footerNote={<BuilderOutreachSignature />}
    >
      <p style={paragraphStyle}>
        Shipyard gives you a polished launch profile, weekly visibility boosts,
        and a friendly corner of the internet that celebrates indie builders.
      </p>
      <ul style={listStyle}>
        <li>Publish instantly with screenshots, story, and tech stack tags.</li>
        <li>
          Share product updates and changelog notes anytime without an approval
          queue.
        </li>
        <li>
          Reach a curated community of makers hunting for the next wave of
          products.
        </li>
      </ul>
      <p style={paragraphStyle}>
        It is early days aboard Shipyard, so we are hand-inviting builders whose
        work we admire. Listing is free and only takes a couple of minutes.
      </p>
      <p style={paragraphStyle}>
        Have questions or want a second set of eyes on your launch copy? Email
        me at{" "}
        <a
          href="mailto:shipyardhq.dev@gmail.com"
          style={{ color: "#2563eb", textDecoration: "none" }}
        >
          shipyardhq.dev@gmail.com
        </a>{" "}
        and I will personally help out.
      </p>
    </BaseEmailTemplate>
  )
}

function BuilderOutreachSignature() {
  return (
    <div style={footerParagraphStyle}>
      <p style={paragraphStyle}>Fair winds,</p>
      <p style={paragraphStyle}>
        Abhimanyu - Shipyard Crew
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
    `Hey ${greeting}, my name is Abhimanyu from Shipyard HQ. We are building a harbor for indie makers to launch, learn, and swap feedback together.`,
    "",
    "Shipyard gives you a polished launch profile, weekly visibility boosts, and a friendly corner of the internet that celebrates indie builders.",
    "",
    "Here are a few ways crews use Shipyard:",
    "- Publish instantly with screenshots, story, and tech stack tags.",
    "- Share product updates and changelog notes anytime without an approval queue.",
    "- Reach a curated community of makers hunting for the next wave of products.",
    "",
    "It is early days aboard Shipyard, so we are hand-inviting builders whose work we admire. Listing is free and takes just a couple of minutes.",
    `Start here: ${BUILDER_OUTREACH_CTA_URL}`,
    "",
    "Have questions or want a second set of eyes on your launch copy? Email me at shipyardhq.dev@gmail.com and I will personally help out.",
    "",
    "Fair winds,",
    "Abhimanyu - Shipyard Crew",
    "https://shipyardhq.dev",
  ]

  return lines.join("\n")
}
