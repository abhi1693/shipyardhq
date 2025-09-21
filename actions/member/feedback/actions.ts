"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import prisma from "@/lib/prisma"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import type { FeedbackStatus } from "@/lib/vendor/prisma/client"
import {
  memberFeedbackSchema,
  type MemberFeedbackFormValues,
} from "@/lib/validation/memberFeedback"
type FeedbackFormInput = MemberFeedbackFormValues

export type MemberFeedbackListItem = {
  id: string
  subject: string | null
  message: string
  rating: number | null
  status: FeedbackStatus
  adminNote: string | null
  createdAt: string
  updatedAt: string
}

async function getCurrentUserContext() {
  const { userId } = await auth()
  if (!userId) return { userId: null as string | null, user: null }
  const user = await getActiveUserByClerkId(userId)
  return { userId, user }
}

export async function listMyFeedback(limit = 20): Promise<MemberFeedbackListItem[]> {
  const { user } = await getCurrentUserContext()
  if (!user) {
    return []
  }

  const pageSize = Math.max(1, Math.min(limit, 100))

  const rows = await prisma.memberFeedback.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: pageSize,
  })

  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    message: row.message,
    rating: row.rating,
    status: row.status,
    adminNote: row.adminNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export async function submitMemberFeedback(formData: FormData) {
  const { user, userId } = await getCurrentUserContext()
  if (!userId) {
    return { error: "Not authenticated" }
  }
  if (!user) {
    return { error: INACTIVE_ACCOUNT_MESSAGE }
  }

  const parsed = memberFeedbackSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    rating: formData.get("rating"),
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      error: first?.message ?? "Please double-check your feedback and try again.",
    }
  }

  const input: FeedbackFormInput = parsed.data
  const subject = input.subject && input.subject.length ? input.subject : undefined
  const rating = input.rating ? Number(input.rating) : undefined

  try {
    await prisma.memberFeedback.create({
      data: {
        userId: user.id,
        subject,
        message: input.message,
        rating,
      },
    })
  } catch (error) {
    console.error("submitMemberFeedback failed", error)
    return { error: "Unable to save your feedback right now." }
  }

  revalidatePath("/member/feedback")
  return { success: true }
}
