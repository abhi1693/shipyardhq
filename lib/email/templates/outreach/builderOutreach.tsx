import type { CSSProperties } from "react"

import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { MEMBER_PRODUCTS_PATH } from "@/lib/routes"

export const BUILDER_OUTREACH_SUBJECTS = [
  "Skip the Product Hunt scramble - Shipyard has your crew",
  "Upgrade from Product Hunt buzz to Shipyard traction",
  "Shipyard delivers what Product Hunt can't",
  "Ready for more than a Product Hunt spike? Try Shipyard",
  "Shipyard keeps momentum long after Product Hunt fades",
  "Trade Product Hunt noise for Shipyard signal",
  "Launch past Product Hunt with Shipyard's playbook",
  "Shipyard: your Product Hunt alternative with follow-through",
  "Builders stick around on Shipyard, not the Product Hunt feed",
  "Shipyard insights beat Product Hunt upvotes",
  "Shipyard spotlight outruns the Product Hunt front page",
  "Shipyard support goes beyond Product Hunt day one",
  "Shipyard turns Product Hunt launches into long-term wins",
  "Shipyard guidance beats those Product Hunt refresh loops",
  "More signal, less scroll: Shipyard over Product Hunt",
  "Shipyard's data gives Product Hunt a run for its money",
  "Product Hunt hopefuls graduate to Shipyard guidance",
  "Shipyard converts Product Hunt interest into action",
  "Shipyard helps builders do more than chase Product Hunt",
  "Shipyard keeps eyes on you after Product Hunt scrolling stops",
  "Shipyard's community lifts you further than Product Hunt hype",
  "Shipyard analytics outclass Product Hunt guesswork",
  "Shipyard is where Product Hunt buzz finds real traction",
  "Shipyard makes your Product Hunt prep actually pay off",
  "Shipyard backs your launch when Product Hunt moves on",
  "Shipyard gives Product Hunt veterans a smarter home",
  "Shipyard replaces Product Hunt luck with strategy",
  "Shipyard builders don't need Product Hunt lottery tickets",
  "Shipyard is the confident alternative to Product Hunt",
  "Shipyard turns Product Hunt energy into lasting growth",
] as const

export const BUILDER_OUTREACH_SUBJECT = BUILDER_OUTREACH_SUBJECTS[0]
export const BUILDER_OUTREACH_PREVIEW_TEXT =
  "Prep with guided checklists, expert review, and weekly insights."
export const BUILDER_OUTREACH_CTA_URL = `https://shipyardhq.dev${MEMBER_PRODUCTS_PATH}`

export function pickBuilderOutreachSubject() {
  const index = Math.floor(Math.random() * BUILDER_OUTREACH_SUBJECTS.length)
  return BUILDER_OUTREACH_SUBJECTS[index]
}

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
  subject?: string
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
  subject,
}: BuilderOutreachEmailProps) {
  const greeting = getGreeting(firstName)
  const resolvedSubject = subject ?? BUILDER_OUTREACH_SUBJECT

  return (
    <BaseEmailTemplate
      renderMode={renderMode}
      title={resolvedSubject}
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
          via sponsored placements, editorial newsletters, and community
          features.
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
    "- Share updates at your pace; when you're ready we can spotlight you via sponsored placements, editorial newsletters, and community features.",
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
