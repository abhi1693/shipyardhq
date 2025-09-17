"use server"

import prisma from "@/lib/prisma"
import { Prisma, UserStatus } from "@/lib/vendor/prisma/client"
import { revalidateProducts } from "@/lib/cache/revalidate"
import { auth, clerkClient } from "@clerk/nextjs/server"

export async function getUsers(args = {}) {
  try {
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      ...args,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    throw new Error("Failed to fetch users")
  }
}

export async function getUserById(
  id: string,
  args: Omit<Prisma.UserFindUniqueArgs, "where"> = {},
) {
  try {
    return await prisma.user.findUnique({
      where: { id },
      ...args,
    })
  } catch (error) {
    console.error("Error fetching user by ID:", error)
    throw new Error("Failed to fetch user")
  }
}

export async function createUserAction(formData: FormData) {
  const clerkId = formData.get("clerkId")
  const email = formData.get("email")
  const firstName = formData.get("firstName")
  const lastName = formData.get("lastName")
  const role = formData.get("role") || "member"

  if (
    typeof clerkId !== "string" ||
    typeof email !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string"
  ) {
    return { error: "All fields except role are required" }
  }

  try {
    await prisma.user.create({
      data: {
        clerkId,
        email,
        firstName,
        lastName,
        role: String(role),
      },
    })
    // Users list depends on products count, revalidate products-driven caches
    revalidateProducts()
    return { success: true }
  } catch (error: any) {
    console.error("Error creating user:", error)
    return {
      error:
        error?.code === "P2002"
          ? "User already exists"
          : "Failed to create user",
    }
  }
}

export async function updateUserAction(
  id: string,
  data: {
    email: string
    firstName: string
    lastName: string
    role: string
  },
) {
  try {
    const result = await prisma.user.update({
      where: { id },
      data,
    })
    revalidateProducts()
    return result
  } catch (error) {
    console.error("Error updating user:", error)
    return { error: "Failed to update user" }
  }
}

export async function deleteUserAction(id: string) {
  try {
    const result = await prisma.user.delete({
      where: { id },
    })
    revalidateProducts()
    return result
  } catch (error) {
    console.error("Error deleting user:", error)
    return { error: "Failed to delete user" }
  }
}

export async function setUserStatusAction(id: string, status: UserStatus) {
  try {
    const { userId: currentClerkId, sessionClaims } = await auth()

    if (!currentClerkId) {
      return { error: "Not authenticated" }
    }

    if (sessionClaims?.metadata?.role !== "admin") {
      return { error: "Unauthorized" }
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { clerkId: true },
    })

    if (!target) {
      return { error: "User not found" }
    }

    if (target.clerkId === currentClerkId) {
      return { error: "You cannot change your own status" }
    }

    const now = new Date()

    const data: Prisma.UserUpdateInput = {
      status,
    }

    if (status === "suspended") {
      data.suspendedAt = now
      data.terminatedAt = null
    } else if (status === "terminated") {
      data.terminatedAt = now
      data.suspendedAt = null
    } else if (status === "active") {
      data.suspendedAt = null
      data.terminatedAt = null
    }

    const result = await prisma.user.update({
      where: { id },
      data,
    })

    const client = await clerkClient()
    const clerkUser = await client.users.getUser(target.clerkId)
    const publicMetadata = {
      ...(clerkUser.publicMetadata || {}),
      status,
    }
    const privateMetadata = {
      ...(clerkUser.privateMetadata || {}),
      status,
    }

    await client.users.updateUser(target.clerkId, {
      publicMetadata,
      privateMetadata,
    })

    try {
      if (status !== "active") {
        await client.users.banUser(target.clerkId)
      } else {
        await client.users.unbanUser(target.clerkId)
      }
    } catch (sessionError) {
      console.error("Failed to update user ban state:", sessionError)
    }

    revalidateProducts()
    return result
  } catch (error) {
    console.error("Error updating user status:", error)
    return { error: "Failed to update user status" }
  }
}
