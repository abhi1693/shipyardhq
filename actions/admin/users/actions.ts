"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { revalidateProducts } from "@/lib/cache/revalidate"

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
