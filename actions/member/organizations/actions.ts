"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { requireMemberFeature } from "@/lib/memberFeatures"
import { redirect } from "next/navigation"

export async function getMyOrganizations() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthenticated")

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) throw new Error("User not found")

  const gate = await requireMemberFeature("organization")
  // When not entitled, return an empty list to keep the
  // return type consistent with the array expected by callers.
  if (!gate.ok) {
    return []
  }

  return prisma.organization.findMany({
    where: { memberships: { some: { userId: user.id } } },
    select: { id: true, name: true, url: true },
    orderBy: { name: "asc" },
  })
}

export async function getMyOrganizationById(id: string) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthenticated")
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) throw new Error("User not found")
  const gate = await requireMemberFeature("organization")
  if (!gate.ok) return null
  const org = await prisma.organization.findFirst({
    where: { id, memberships: { some: { userId: user.id } } },
    select: {
      id: true,
      name: true,
      url: true,
      createdAt: true,
      updatedAt: true,
      ownerUserId: true,
    } as any,
  })
  return org
}

export async function getMyOrganizationsPage(
  params?: Record<string, string | string[] | undefined>,
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthenticated")
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) throw new Error("User not found")

  const gate = await requireMemberFeature("organization")
  if (!gate.ok) redirect("/member/organizations")

  const q = ((params?.q as string) || "").trim()
  const page = Math.max(1, parseInt((params?.page as string) || "1", 10) || 1)
  const limit = Math.max(
    1,
    parseInt((params?.limit as string) || "10", 10) || 10,
  )
  const skip = (page - 1) * limit

  const where: any = { memberships: { some: { userId: user.id } } }
  if (q.length) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { url: { contains: q, mode: "insensitive" } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: { id: true, name: true, url: true, createdAt: true },
    }),
    prisma.organization.count({ where }),
  ])

  return { rows, total, page, limit }
}

export async function getMyOrganizationMembers(orgId: string) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthenticated")
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) throw new Error("User not found")
  const gate = await requireMemberFeature("organization")
  if (!gate.ok) redirect("/member/organizations")
  const org = await prisma.organization.findFirst({
    where: { id: orgId, memberships: { some: { userId: user.id } } },
    select: { ownerUserId: true },
  })
  if (!org) throw new Error("Not authorized")
  const rows = await prisma.organizationMembership.findMany({
    where: { organizationId: orgId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  })
  return rows.map((m) => ({
    id: m.id,
    userId: m.userId,
    createdAt: m.createdAt,
    user: {
      id: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
    },
    isOwner: org.ownerUserId === m.userId,
  }))
}

export async function addMyOrganizationMemberAction(
  orgId: string,
  email: string,
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }
  try {
    const current = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
    if (!current) return { error: "User not found" }
    const gate = await requireMemberFeature("organization")
    if (!gate.ok) return { error: "Upgrade required for organizations" }
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { ownerUserId: true },
    })
    const member = await prisma.organizationMembership.findFirst({
      where: { organizationId: orgId, userId: current.id },
    })
    if (!org || !member) return { error: "Not authorized" }
    if (org.ownerUserId !== current.id)
      return { error: "Only the owner can add members" }
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (!user) return { error: "User not found. Ask them to sign up first." }
    await prisma.organizationMembership.create({
      data: { organizationId: orgId, userId: user.id },
    })
    return { success: true }
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "User is already a member" }
    console.error("Add member failed", e)
    return { error: "Failed to add member" }
  }
}

export async function deleteMyOrganizationMemberAction(membershipId: string) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }
  try {
    const current = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
    if (!current) return { error: "User not found" }
    const gate = await requireMemberFeature("organization")
    if (!gate.ok) return { error: "Upgrade required for organizations" }
    const membership = await prisma.organizationMembership.findUnique({
      where: { id: membershipId },
    })
    if (!membership) return { error: "Membership not found" }
    const org = await prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: { ownerUserId: true },
    })
    if (!org) return { error: "Not authorized" }
    if (org.ownerUserId !== current.id)
      return { error: "Only the owner can remove members" }
    if (membership.userId === org.ownerUserId)
      return { error: "Cannot remove the owner" }
    await prisma.organizationMembership.delete({ where: { id: membershipId } })
    return { success: true }
  } catch (e) {
    console.error("Delete member failed", e)
    return { error: "Failed to remove member" }
  }
}

export async function createMyOrganizationAction(formData: FormData) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }
  const name = formData.get("name")?.toString().trim()
  const url = formData.get("url")?.toString().trim()
  if (!name) return { error: "Name is required" }
  if (!url) return { error: "URL is required" }
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
    if (!user) return { error: "User not found" }
    const gate = await requireMemberFeature("organization")
    if (!gate.ok) return { error: "Upgrade required for organizations" }
    await prisma.organization.create({
      data: {
        name,
        url,
        ownerUserId: user.id,
        memberships: { create: { userId: user.id } },
      },
    })
    return { success: true }
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "Organization URL already exists" }
    console.error("Create org failed", e)
    return { error: "Failed to create organization" }
  }
}

export async function updateOrganizationOwnerAction(
  orgId: string,
  newOwnerUserId: string,
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }
  try {
    const current = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
    if (!current) return { error: "User not found" }
    const gate = await requireMemberFeature("organization")
    if (!gate.ok) return { error: "Upgrade required for organizations" }
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { ownerUserId: true },
    })
    if (!org) return { error: "Organization not found" }
    if (org.ownerUserId !== current.id)
      return { error: "Only the owner can change ownership" }
    const membership = await prisma.organizationMembership.findFirst({
      where: { organizationId: orgId, userId: newOwnerUserId },
    })
    if (!membership) return { error: "New owner must be a member" }
    await prisma.organization.update({
      where: { id: orgId },
      data: { ownerUserId: newOwnerUserId } as any,
    })
    return { success: true }
  } catch (e) {
    console.error("Change owner failed", e)
    return { error: "Failed to change owner" }
  }
}

export async function updateMyOrganizationAction(
  id: string,
  data: { name: string; url: string },
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
    if (!user) return { error: "User not found" }
    const gate = await requireMemberFeature("organization")
    if (!gate.ok) return { error: "Upgrade required for organizations" }
    const org = await prisma.organization.findUnique({
      where: { id },
      select: { ownerUserId: true },
    })
    if (!org) return { error: "Organization not found" }
    if (org.ownerUserId !== user.id)
      return { error: "Only the owner can edit the organization" }
    await prisma.organization.update({
      where: { id },
      data: { name: data.name.trim(), url: data.url.trim() },
    })
    return { success: true }
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "Organization URL already exists" }
    console.error("Update org failed", e)
    return { error: "Failed to update organization" }
  }
}

export async function deleteMyOrganizationAction(id: string) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
    if (!user) return { error: "User not found" }
    const gate = await requireMemberFeature("organization")
    if (!gate.ok) return { error: "Upgrade required for organizations" }
    const org = await prisma.organization.findUnique({
      where: { id },
      select: { ownerUserId: true },
    })
    if (!org) return { error: "Organization not found" }
    if (org.ownerUserId !== user.id)
      return { error: "Only the owner can delete the organization" }
    await prisma.organization.delete({ where: { id } })
    return { success: true }
  } catch (e) {
    console.error("Delete org failed", e)
    return { error: "Failed to delete organization" }
  }
}
