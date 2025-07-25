import prisma from "@/lib/prisma"

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
