"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { requireMemberFeature } from "@/lib/memberFeatures"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ensureUrlHasSchema } from "@/lib/utils"
import { sendOrganizationMemberInviteEmail } from "@/lib/server/email/organizationMemberInvite"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
  requireActiveUserOrRedirect,
} from "@/lib/server/userStatus"

async function requireActiveCurrentUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthenticated")
  return requireActiveUserOrRedirect(clerkId)
}

function formatUserName(user: {
  firstName: string | null
  lastName: string | null
  email: string
}) {
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
  return full.length ? full : user.email
}

export async function getMyOrganizations() {
  const user = await requireActiveCurrentUser()

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
  const user = await requireActiveCurrentUser()
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
  const user = await requireActiveCurrentUser()

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
      select: {
        id: true,
        name: true,
        url: true,
        createdAt: true,
        ownerUserId: true,
      },
    }),
    prisma.organization.count({ where }),
  ])

  return { rows, total, page, limit }
}

export async function getMyOrganizationMembers(orgId: string) {
  const user = await requireActiveCurrentUser()
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

export async function getMyOrganizationsWithProducts() {
  const user = await requireActiveCurrentUser()
  const gate = await requireMemberFeature("organization")
  if (!gate.ok) redirect("/member/organizations")

  return prisma.organization.findMany({
    where: { memberships: { some: { userId: user.id } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      url: true,
      ownerUserId: true,
      Product: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          plan: { select: { id: true, name: true } },
        },
      },
    },
  })
}

export async function getMyOrganizationProducts(orgId: string) {
  const user = await requireActiveCurrentUser()
  const gate = await requireMemberFeature("organization")
  if (!gate.ok) redirect("/member/organizations")

  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId: orgId, userId: user.id },
    select: { id: true },
  })
  if (!membership) redirect("/member/organizations")

  return prisma.product.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      plan: { select: { id: true, name: true } },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })
}

export async function getMyAvailableProductsForOrganization(orgId: string) {
  const user = await requireActiveCurrentUser()
  const gate = await requireMemberFeature("organization")
  if (!gate.ok) return []

  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId: orgId, userId: user.id },
    select: { id: true },
  })
  if (!membership) return []

  return prisma.product.findMany({
    where: { userId: user.id, organizationId: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, slug: true },
  })
}

export async function addMyOrganizationMemberAction(
  orgId: string,
  email: string,
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }
  try {
    const current = await getActiveUserByClerkId(clerkId)
    if (!current) return { error: INACTIVE_ACCOUNT_MESSAGE }
    const gate = await requireMemberFeature("organization")
    if (!gate.ok) return { error: "Upgrade required for organizations" }
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { ownerUserId: true, name: true },
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

    try {
      await sendOrganizationMemberInviteEmail({
        to: email,
        organizationId: orgId,
        organizationName: org.name ?? "your Shipyard organization",
        inviterName: formatUserName(current),
      })
    } catch (error) {
      console.error("Organization invite email failed", error)
    }
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
    const current = await getActiveUserByClerkId(clerkId)
    if (!current) return { error: INACTIVE_ACCOUNT_MESSAGE }
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

export async function attachProductToOrganizationAction(
  ctx: { organizationId: string; redirectPath: string },
  formData: FormData,
) {
  const productId = formData.get("productId")?.toString()
  if (!productId) return { error: "Product is required" }

  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }

  try {
    const user = await getActiveUserByClerkId(clerkId)
    if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

    const gate = await requireMemberFeature("organization")
    if (!gate.ok) return { error: "Upgrade required for organizations" }

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { ownerUserId: true },
    })
    if (!org) return { error: "Organization not found" }
    if (org.ownerUserId !== user.id)
      return { error: "Only the owner can connect products" }

    const product = await prisma.product.findFirst({
      where: { id: productId, userId: user.id },
      select: { organizationId: true },
    })
    if (!product) return { error: "Product not found" }
    if (product.organizationId && product.organizationId !== ctx.organizationId)
      return { error: "Product already linked to another organization" }

    await prisma.product.update({
      where: { id: productId },
      data: { organizationId: ctx.organizationId },
    })
  } catch (e) {
    console.error("Attach product failed", e)
    return { error: "Failed to connect product" }
  }

  revalidatePath(ctx.redirectPath)
  redirect(ctx.redirectPath)
}

export async function createMyOrganizationAction(formData: FormData) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }
  const name = formData.get("name")?.toString().trim()
  const url = ensureUrlHasSchema(formData.get("url")?.toString() ?? "")
  if (!name) return { error: "Name is required" }
  if (!url) return { error: "URL is required" }
  try {
    new URL(url)
  } catch {
    return { error: "Invalid URL" }
  }
  try {
    const user = await getActiveUserByClerkId(clerkId)
    if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }
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
    const current = await getActiveUserByClerkId(clerkId)
    if (!current) return { error: INACTIVE_ACCOUNT_MESSAGE }
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
    const user = await getActiveUserByClerkId(clerkId)
    if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }
    const gate = await requireMemberFeature("organization")
    if (!gate.ok) return { error: "Upgrade required for organizations" }
    const org = await prisma.organization.findUnique({
      where: { id },
      select: { ownerUserId: true },
    })
    if (!org) return { error: "Organization not found" }
    if (org.ownerUserId !== user.id)
      return { error: "Only the owner can edit the organization" }
    const nextUrl = ensureUrlHasSchema(data.url)
    try {
      new URL(nextUrl)
    } catch {
      return { error: "Invalid URL" }
    }
    await prisma.organization.update({
      where: { id },
      data: {
        name: data.name.trim(),
        url: nextUrl,
      },
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
    const user = await getActiveUserByClerkId(clerkId)
    if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }
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
