import { memberOrganizationPath } from "@/lib/routes"
import {
  guardNovuWorkflow,
  triggerNovuWorkflow,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"
import { resolveSiteUrl } from "@/lib/siteConfig"

const NOVU_ORG_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_ORGANIZATION_NOTIFICATIONS?.trim() ?? null

export type OrganizationNotificationKind = "organization_member_invite"

type OrganizationInviteInput = {
  organizationId: string
  organizationName: string
  inviterName?: string | null
  invitee: NovuSubscriberInput
}

export async function sendOrganizationInviteNotification(
  input: OrganizationInviteInput,
): Promise<void> {
  const workflow = guardNovuWorkflow(NOVU_ORG_WORKFLOW_ID, {
    label: "organization notifications",
    missingMessage:
      "[novu] NOVU_WORKFLOW_ORGANIZATION_NOTIFICATIONS is not set",
  })
  if (!workflow.ready) return

  const { organizationId, organizationName, inviterName, invitee } = input
  if (!invitee.subscriberId?.trim()) {
    console.warn("[novu] organization invite missing subscriber id", {
      organizationId,
    })
    return
  }

  const subscriber = {
    ...invitee,
    subscriberId: invitee.subscriberId.trim(),
  }

  try {
    const siteUrl = resolveSiteUrl()

    const memberLink = new URL(
      memberOrganizationPath(organizationId),
      `${siteUrl}/`,
    ).toString()
    const timestamp = new Date().toISOString()
    const subject = `${inviterName?.trim()?.length ? inviterName : "A teammate"} added you to ${organizationName}`
    const message = `You were added to ${organizationName}. Open the organization to get started.`

    await triggerNovuWorkflow({
      workflowId: workflow.workflowId,
      subscriber,
      payload: {
        notification: {
          kind: "organization_member_invite",
          message,
          subject,
          timestamp,
        },
        organization: {
          id: organizationId,
          name: organizationName,
        },
        links: {
          member: memberLink,
        },
        context: {
          organization_member_invite: {
            organizationId,
            organizationName,
            inviterName: inviterName ?? null,
          },
        },
        tags: ["organization", "invite"],
      },
      transactionId: `organization_invite:${organizationId}:${subscriber.subscriberId}:${timestamp}`,
    })
  } catch (error) {
    console.error("[novu] failed to send organization invite", {
      error,
      organizationId,
      subscriberId: subscriber.subscriberId,
    })
  }
}
