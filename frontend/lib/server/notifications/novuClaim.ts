import {
  guardNovuWorkflow,
  triggerNovuWorkflow,
} from "@/lib/server/notifications/novu"

const NOVU_PRODUCT_CLAIM_OTP_WORKFLOW_ID =
  process.env.NOVU_WORKFLOW_PRODUCT_CLAIM_OTP?.trim() || "product-claim-otp"

type ClaimOtpRecipient = {
  subscriberId: string
  email: string
  firstName?: string | null
  lastName?: string | null
}

type ClaimOtpPayload = {
  code: string
  productName: string
  domain: string
  expiresAt: string
  method?: string | null
}

export async function sendClaimOtpNotification(input: {
  recipient: ClaimOtpRecipient
  payload: ClaimOtpPayload
  transactionId?: string
}): Promise<void> {
  const workflow = guardNovuWorkflow(NOVU_PRODUCT_CLAIM_OTP_WORKFLOW_ID, {
    label: "product claim otp",
    missingMessage: "[novu] product claim OTP workflow id missing",
  })
  if (!workflow.ready) return

  const subscriberId = input.recipient.subscriberId.trim()
  if (!subscriberId) {
    console.warn("[novu] missing subscriber id for claim OTP")
    return
  }

  const subscriber = {
    subscriberId,
    email: input.recipient.email,
    firstName: input.recipient.firstName ?? undefined,
    lastName: input.recipient.lastName ?? undefined,
  }

  try {
    await triggerNovuWorkflow({
      workflowId: workflow.workflowId,
      subscriber,
      payload: {
        notification: {
          kind: "product_claim_otp",
          code: input.payload.code,
          method: input.payload.method ?? "email_otp",
          domain: input.payload.domain,
          productName: input.payload.productName,
          expiresAt: input.payload.expiresAt,
          timestamp: new Date().toISOString(),
        },
      },
      transactionId: input.transactionId?.trim() || undefined,
    })
  } catch (error) {
    console.error("[novu] failed to send product claim OTP", {
      error,
      subscriberId,
    })
  }
}

export type { ClaimOtpPayload, ClaimOtpRecipient }
