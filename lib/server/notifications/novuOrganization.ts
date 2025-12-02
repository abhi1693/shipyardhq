import prisma from "@/lib/prisma"
import { memberProductEditPath, memberOrganizationPath } from "@/lib/routes"
import {
  ensureNovuSubscriber,
  isNovuEnabled,
  triggerNovuWorkflow,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"
import { resolveSiteUrl } from "@/lib/siteConfig"

const NOVU_ORG_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_ORGANIZATION_NOTIFICATIONS?.trim() ?? null

export type OrganizationNotificationKind =
  | "organization_member_invite"

type OrganizationInviteInput = {
  organizationId: string
  organizationName: string
  inviterName?: string | null
  invitee: NovuSubscriberInput
}

export async function sendOrganizationInviteNotification(
  input: OrganizationInviteInput,
): Promise<void> {
  if (!isNovuEnabled()) return
  if (!NOVU_ORG_WORKFLOW_ID) {
    console.warn("[novu] NOVU_WORKFLOW_ORGANIZATION_NOTIFICATIONS is not set")
    return
  }

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
    await ensureNovuSubscriber(subscriber)

    const memberLink = new URL(
      memberOrganizationPath(organizationId),
      `${siteUrl}/`,
    ).toString()
    const timestamp = new Date().toISOString()
    const subject = `${inviterName?.trim()?.length ? inviterName : "A teammate"} added you to ${organizationName}`
    const message = `You were added to ${organizationName}. Open the organization to get started.`

    await triggerNovuWorkflow({
      workflowId: NOVU_ORG_WORKFLOW_ID,
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
