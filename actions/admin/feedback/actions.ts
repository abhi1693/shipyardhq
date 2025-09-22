"use server"

import prisma from "@/lib/prisma"
import { FeedbackStatus, Prisma } from "@/lib/vendor/prisma/client"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { adminPath } from "@/lib/routes"

const feedbackSelect = {
  id: true,
  subject: true,
  message: true,
  rating: true,
  status: true,
  adminNote: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.MemberFeedbackSelect

export type AdminFeedbackEntry = Prisma.MemberFeedbackGetPayload<{
  select: typeof feedbackSelect
}>

const ADMIN_FEEDBACK_PATH = adminPath("feedback")

export async function getFeedbackEntries({
  skip = 0,
  take = 20,
  status,
}: {
  skip?: number
  take?: number
  status?: FeedbackStatus | "all"
} = {}) {
  try {
    const where: Prisma.MemberFeedbackWhereInput = {}
    if (status && status !== "all") {
      where.status = status
    }

    return await prisma.memberFeedback.findMany({
      select: feedbackSelect,
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    })
  } catch (error) {
    console.error("getFeedbackEntries failed", error)
    throw new Error("Unable to load feedback")
  }
}

export async function getFeedbackCount({
  status,
}: {
  status?: FeedbackStatus | "all"
} = {}) {
  try {
    const where: Prisma.MemberFeedbackWhereInput = {}
    if (status && status !== "all") {
      where.status = status
    }
    return await prisma.memberFeedback.count({ where })
  } catch (error) {
    console.error("getFeedbackCount failed", error)
    throw new Error("Unable to count feedback entries")
  }
}

export async function updateFeedbackStatus({
  id,
  status,
}: {
  id: string
  status: FeedbackStatus
}) {
  try {
    const { sessionClaims } = await auth()
    if (sessionClaims?.metadata?.role !== "admin") {
      return { error: "Unauthorized" }
    }

    await prisma.memberFeedback.update({
      where: { id },
      data: { status },
    })

    revalidatePath(ADMIN_FEEDBACK_PATH)
    return { success: true }
  } catch (error) {
    console.error("updateFeedbackStatus failed", error)
    return { error: "Unable to update feedback status" }
  }
}

export async function updateFeedbackAdminNote({
  id,
  note,
}: {
  id: string
  note?: string
}) {
  try {
    const { sessionClaims } = await auth()
    if (sessionClaims?.metadata?.role !== "admin") {
      return { error: "Unauthorized" }
    }

    const adminNote = note?.trim() ?? null
    if (adminNote && adminNote.length > 2000) {
      return { error: "Admin note must be 2000 characters or fewer" }
    }

    await prisma.memberFeedback.update({
      where: { id },
      data: { adminNote },
    })

    revalidatePath(ADMIN_FEEDBACK_PATH)
    return { success: true }
  } catch (error) {
    console.error("updateFeedbackAdminNote failed", error)
    return { error: "Unable to update admin note" }
  }
}
