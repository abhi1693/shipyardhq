"use server"

import prisma from "@/lib/prisma"
import { Prisma, UserStatus } from "@/lib/vendor/prisma/client"
import { revalidateProducts } from "@/lib/cache/revalidate"
import { auth, clerkClient } from "@clerk/nextjs/server"
import {
  getActiveUserByClerkId,
  invalidateActiveUserCache,
} from "@/lib/server/userStatus"

const SEARCH_LIMIT = 25

export async function getUsers(args: Prisma.UserFindManyArgs = {}) {
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

export async function getUsersCount(args: Prisma.UserCountArgs = {}) {
  try {
    return await prisma.user.count(args)
  } catch (error) {
    console.error("Error counting users:", error)
    throw new Error("Failed to count users")
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
    await invalidateActiveUserCache(clerkId)
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
    await invalidateActiveUserCache(result.clerkId)
    revalidateProducts()
    return result
  } catch (error) {
    console.error("Error updating user:", error)
    return { error: "Failed to update user" }
  }
}

export async function deleteUserAction(id: string) {
  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { clerkId: true },
    })
    const result = await prisma.user.delete({
      where: { id },
    })
    await invalidateActiveUserCache(existing?.clerkId)
    revalidateProducts()
    return result
  } catch (error) {
    console.error("Error deleting user:", error)
    return { error: "Failed to delete user" }
  }
}

export async function searchAdminUsersAction(query: string) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    throw new Error("Not authenticated")
  }

  const adminUser = await getActiveUserByClerkId(clerkId)
  if (!adminUser || adminUser.role !== "admin") {
    throw new Error("Unauthorized")
  }

  const trimmed = query.trim()
  if (!trimmed.length) {
    return []
  }

  const terms = trimmed
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean)

  if (!terms.length) {
    return []
  }

  try {
    return await prisma.user.findMany({
      where: {
        AND: terms.map((term) => ({
          OR: [
            { email: { contains: term, mode: "insensitive" } },
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
          ],
        })),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { email: "asc" },
      take: SEARCH_LIMIT,
    })
  } catch (error) {
    console.error("[admin.users.search] Failed to search users", error)
    throw new Error("Unable to search users")
  }
}

export async function setUserStatusAction(id: string, status: UserStatus) {
  try {
    const { userId: currentClerkId } = await auth()

    if (!currentClerkId) {
      return { error: "Not authenticated" }
    }

    const currentUser = await getActiveUserByClerkId(currentClerkId)
    if (!currentUser || currentUser.role !== "admin") {
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
    await invalidateActiveUserCache(target.clerkId)
    return result
  } catch (error) {
    console.error("Error updating user status:", error)
    return { error: "Failed to update user status" }
  }
}
