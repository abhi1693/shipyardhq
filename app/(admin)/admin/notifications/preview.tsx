"use client"

import { useMemo } from "react"
import type { ReactElement } from "react"
import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"
import { deriveFirstNameFromEmail } from "@/lib/email/personalization"

const paragraphStyle = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
  color: "#1f2937",
} as const

const DEFAULT_GREETING = "shipmate"

function renderParagraphs(message: string): ReactElement[] {
  const trimmed = message.trim()
  if (!trimmed) return []

  return trimmed.split(/\n{2,}/).map((block, index) => {
    const lines = block.trim().split(/\n/)

    return (
      <p key={index} style={paragraphStyle}>
        {lines.map((line, lineIndex) => (
          <span key={`${index}-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    )
  })
}

function getPreviewText(message: string): string | undefined {
  const collapsed = message.replace(/\s+/g, " ").trim()
  return collapsed ? collapsed.slice(0, 140) : undefined
}

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

  const content = useMemo(() => renderParagraphs(message), [message])
  const previewText = useMemo(() => getPreviewText(message), [message])

  return (
    <div className="email-preview">
      <BaseEmailTemplate
        previewText={previewText}
        title={subject || "Shipyard HQ"}
        renderMode="preview"
        footerNote={<PreviewSignature />}
      >
        <p style={paragraphStyle}>Dear {greetingName},</p>
        {content.length > 0 ? (
          content
        ) : (
          <p style={paragraphStyle}>
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
      <p style={paragraphStyle}>Wishing you fair winds,</p>
      <p style={paragraphStyle}>
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
