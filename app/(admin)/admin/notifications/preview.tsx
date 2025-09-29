"use client"

import { useMemo } from "react"
import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { deriveFirstNameFromEmail } from "@/lib/email/personalization"
import {
  EMAIL_PARAGRAPH_STYLE,
  getEmailPreviewText,
  renderEmailMarkdown,
} from "@/lib/email/markdown"

const DEFAULT_GREETING = "shipmate"

type PreviewRecipient = {
  firstName?: string | null
  email?: string | null
}

export default function AdminEmailPreview({
  subject,
  message,
  recipient,
}: {
  subject: string
  message: string
  recipient?: PreviewRecipient
  }) {
  const greetingName = useMemo(() => {
    const explicit = recipient?.firstName?.trim()
    if (explicit) {
      return explicit
    }

    if (recipient?.email) {
      return deriveFirstNameFromEmail(recipient.email) ?? DEFAULT_GREETING
    }

    return DEFAULT_GREETING
  }, [recipient])

  const content = useMemo(() => renderEmailMarkdown(message), [message])
  const previewText = useMemo(() => getEmailPreviewText(message), [message])

  return (
    <div className="email-preview">
      <BaseEmailTemplate
        previewText={previewText}
        title={subject || "Shipyard HQ"}
        renderMode="preview"
        footerNote={<PreviewSignature />}
      >
        <p style={EMAIL_PARAGRAPH_STYLE}>Dear {greetingName},</p>
        {content ? (
          content
        ) : (
          <p style={EMAIL_PARAGRAPH_STYLE}>
            Start typing a message to see the preview.
          </p>
        )}
      </BaseEmailTemplate>
    </div>
  )
}

function PreviewSignature() {
  return (
    <div style={{ marginTop: "24px" }}>
      <p style={EMAIL_PARAGRAPH_STYLE}>Wishing you fair winds,</p>
      <p style={EMAIL_PARAGRAPH_STYLE}>
        Shipyard Crew
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
