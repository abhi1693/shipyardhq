"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import prisma from "@/lib/prisma"
import { checkRole } from "@/lib/roles"
import { adminPath } from "@/lib/routes"
import { Prisma } from "@/lib/vendor/prisma/client"

const subscriberSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Ahoy! We need an email to chart a course." })
    .email("That doesn't look like a seaworthy email."),
})

const ADMIN_NEWSLETTER_PATH = adminPath("notifications", "newsletter")

const isNotFoundError = (error: unknown): boolean => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return true
  }

  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as { code?: unknown }
  return candidate.code === "P2025"
}

export async function getNewsletterSubscribers(
  args: Prisma.NewsletterSubscriptionFindManyArgs = {},
) {
  try {
    return await prisma.newsletterSubscription.findMany({
      orderBy: { createdAt: "desc" },
      ...args,
    })
  } catch (error) {
    console.error("getNewsletterSubscribers failed", error)
    throw new Error("Unable to load newsletter subscribers.")
  }
}

export async function getNewsletterSubscriberCount(
  args: Prisma.NewsletterSubscriptionCountArgs = {},
) {
  try {
    return await prisma.newsletterSubscription.count(args)
  } catch (error) {
    console.error("getNewsletterSubscriberCount failed", error)
    throw new Error("Unable to count newsletter subscribers.")
  }
}

export async function createNewsletterSubscriberAction(formData: FormData) {
  const rawEmail = formData.get("email")
  if (typeof rawEmail !== "string") {
    return { error: "Please provide an email." }
  }

  const parsed = subscriberSchema.safeParse({ email: rawEmail.trim() })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message ?? "Please provide a valid email." }
  }

  const email = parsed.data.email.toLowerCase()

  const isAdmin = await checkRole("admin")
  if (!isAdmin) {
    return { error: "Unauthorized" }
  }

  try {
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existing) {
      return { error: "This email is already subscribed." }
    }

    await prisma.newsletterSubscription.upsert({
      where: { email },
      update: { email },
      create: { email },
    })

    revalidatePath(ADMIN_NEWSLETTER_PATH)
    return { success: true }
  } catch (error) {
    console.error("createNewsletterSubscriberAction failed", error)
    return {
      error: "We couldn't add that subscriber just yet. Please try again.",
    }
  }
}

export async function deleteNewsletterSubscriberAction(id: string) {
  const isAdmin = await checkRole("admin")
  if (!isAdmin) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.newsletterSubscription.delete({ where: { id } })
    revalidatePath(ADMIN_NEWSLETTER_PATH)
    return { success: true }
  } catch (error) {
    if (isNotFoundError(error)) {
      return { error: "Subscriber not found." }
    }

    console.error("deleteNewsletterSubscriberAction failed", error)
    return {
      error: "We couldn't remove that subscriber. Please try again soon.",
    }
  }
}
