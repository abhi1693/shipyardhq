"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function getMyOrganizations() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthenticated")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) throw new Error("User not found")

  const orgs = await prisma.organization.findMany({
    where: { memberships: { some: { userId: user.id } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  return orgs
}
