import { sendEmail } from "@/lib/email/resend"
import OrganizationMemberInvitationEmail from "@/lib/email/templates/organization/memberInvitation"
import { getAppBaseUrl } from "@/lib/email/utils"
import { memberOrganizationPath } from "@/lib/routes"

type SendOrganizationMemberInviteOptions = {
  to: string
  organizationId: string
  organizationName: string
  inviterName?: string | null
}

export async function sendOrganizationMemberInviteEmail({
  to,
  organizationId,
  organizationName,
  inviterName,
}: SendOrganizationMemberInviteOptions) {
  const baseUrl = getAppBaseUrl()
  const inviteUrl = `${baseUrl}${memberOrganizationPath(organizationId)}`
  const subjectInviter = inviterName?.trim()?.length
    ? inviterName
    : "A teammate"

  await sendEmail({
    to,
    subject: `${subjectInviter} added you to ${organizationName}`,
    react: (
      <OrganizationMemberInvitationEmail
        organizationName={organizationName}
        inviterName={inviterName}
        inviteUrl={inviteUrl}
      />
    ),
  })
}
