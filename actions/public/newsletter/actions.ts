"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { z } from "zod"

const newsletterSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Ahoy! We need an email to chart a course." })
    .email("That doesn't look like a seaworthy email."),
})

export async function subscribeToNewsletterAction(rawEmail: string) {
  const parsed = newsletterSchema.safeParse({ email: rawEmail.trim() })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message ?? "Please provide a valid email." }
  }

  const email = parsed.data.email.toLowerCase()

  try {
    await prisma.newsletterSubscription.upsert({
      where: { email },
      update: { email },
      create: { email },
    })

    return { success: true }
  } catch (error) {
    console.error("newsletter subscribe failed", error)
    return {
      error: "The tide is rough right now. Please try again shortly.",
    }
  }
}

export async function unsubscribeFromNewsletterAction(rawEmail: string) {
  const parsed = newsletterSchema.safeParse({ email: rawEmail.trim() })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message ?? "Please provide a valid email." }
  }

  const email = parsed.data.email.toLowerCase()

  try {
    await prisma.newsletterSubscription.delete({ where: { email } })
    return { success: true }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      // Already unsubscribed; treat as success
      return { success: true }
    }

    console.error("newsletter unsubscribe failed", error)
    return {
      error: "We couldn't update your logbook entry. Try again soon?",
    }
  }
}
