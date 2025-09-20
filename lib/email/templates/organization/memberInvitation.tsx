import type { CSSProperties } from "react"
import { BaseEmailTemplate } from "@/lib/email/templates/baseTemplate"

type OrganizationMemberInvitationEmailProps = {
  organizationName: string
  inviterName?: string | null
  inviteUrl: string
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

export default function OrganizationMemberInvitationEmail({
  organizationName,
  inviterName,
  inviteUrl,
}: OrganizationMemberInvitationEmailProps) {
  const displayInviter = inviterName?.trim()?.length
    ? inviterName
    : "A teammate"

  return (
    <BaseEmailTemplate
      title={`You were added to ${organizationName}`}
      previewText={`${displayInviter} added you to ${organizationName} on Shipyard HQ.`}
      heading={`Welcome to ${organizationName}`}
      intro={`${displayInviter} just added you to the ${organizationName} organization in Shipyard HQ.`}
      cta={{ label: "Open organization", href: inviteUrl }}
    >
      <p style={paragraphStyle}>
        {
          "You now share access to this workspace, including launches, members, and billing. Only teammates within the organization can see these internal tools."
        }
      </p>
      <p style={paragraphStyle}>{"Here are a few things you can do next:"}</p>
      <ol style={listStyle}>
        <li>Review the organization overview and connected products.</li>
        <li>Invite additional teammates that should collaborate here.</li>
        <li>Update your profile so the crew knows who is onboard.</li>
      </ol>
      <p style={paragraphStyle}>
        {"You can revisit the organization anytime from your member dashboard."}
      </p>
    </BaseEmailTemplate>
  )
}
