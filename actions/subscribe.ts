"use server"

import { z } from "zod"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const emailSchema = z.email()

export async function subscribeToNewsletter(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const emailValue = formData.get("email")
  const parsed = emailSchema.safeParse(emailValue)
  if (!parsed.success) {
    return { success: false, error: "Invalid email address." }
  }

  try {
    await prisma.newsletter.create({
      data: { email: parsed.data },
    })
    return { success: true }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "This email is already subscribed." }
    }
    return { success: false, error: `An unexpected error occurred: ${error}` }
  }
}
