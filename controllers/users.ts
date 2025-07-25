import prisma from "@/lib/prisma"
import { UserFindManySchema } from "@/prisma/generated/schemas"
import { treeifyError } from "zod"

export async function getUsers(args: unknown = {}) {
  const parsed = UserFindManySchema.safeParse(args)

  if (!parsed.success) {
    console.error("Validation error in getUsers:", treeifyError(parsed.error))
    throw new Error("Invalid query arguments for fetching users")
  }

  try {
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      ...parsed.data,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    throw new Error("Failed to fetch users")
  }
}
