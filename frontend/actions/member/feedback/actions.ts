"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { MEMBER_FEEDBACK_PATH } from "@/lib/routes"

import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import {
  memberFeedbackSchema,
  type MemberFeedbackFormValues,
} from "@/lib/validation/memberFeedback"
type FeedbackFormInput = MemberFeedbackFormValues
type FeedbackStatus = "received" | "in_review" | "closed"

const INACTIVE_ACCOUNT_MESSAGE = "Account is not active"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

export type MemberFeedbackListItem = {
  id: string
  subject: string | null
  message: string
  rating: number | null
  status: FeedbackStatus
  adminNote: string | null
  rewardEligible: boolean
  rewardGrantedAt: string | null
  createdAt: string
  updatedAt: string
}

async function getAuthToken() {
  const authResult = await auth()
  if (!authResult.userId) return null
  if (!authResult.getToken) return null
  return authResult.getToken().catch(() => null)
}

export async function listMyFeedback(
  limit = 20,
): Promise<MemberFeedbackListItem[]> {
  const authToken = await getAuthToken()
  if (!authToken) {
    return []
  }

  const pageSize = Math.max(1, Math.min(limit, 100))

  try {
    const response = await fastapiFetch<ApiResponse<MemberFeedbackListItem[]>>(
      `/api/v1/member/feedback?limit=${pageSize}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    )
    if (response.status !== 200 || !Array.isArray(response.data)) {
      return []
    }
    return response.data
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403 || status === 404 || status === 422) {
      return []
    }
    throw error
  }
}

export async function submitMemberFeedback(formData: FormData) {
  const authToken = await getAuthToken()
  if (!authToken) {
    return { error: "Not authenticated" }
  }

  const parsed = memberFeedbackSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    rating: formData.get("rating"),
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      error:
        first?.message ?? "Please double-check your feedback and try again.",
    }
  }

  const input: FeedbackFormInput = parsed.data
  const subject =
    input.subject && input.subject.length ? input.subject : undefined
  const rating = input.rating ? Number(input.rating) : undefined

  try {
    const response = await fastapiFetch<ApiResponse<MemberFeedbackListItem>>(
      "/api/v1/member/feedback",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          message: input.message,
          rating,
        }),
      },
    )
    if (response.status !== 201 || !response.data) {
      return { error: "Unable to save your feedback right now." }
    }
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403) {
      return { error: INACTIVE_ACCOUNT_MESSAGE }
    }
    console.error("submitMemberFeedback failed", error)
    return { error: "Unable to save your feedback right now." }
  }

  revalidatePath(MEMBER_FEEDBACK_PATH)
  return { success: true }
}
