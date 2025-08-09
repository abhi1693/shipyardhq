"use server"

import prisma from "@/lib/prisma"

export async function getOrganizations(args = {}) {
  try {
    return await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      ...args,
    })
  } catch (error) {
    console.error("Error fetching organizations:", error)
    throw new Error("Failed to fetch organizations")
  }
}

export async function getOrganizationById(id: string, args: any = {}) {
  try {
    return await prisma.organization.findUnique({
      where: { id },
      ...args,
    })
  } catch (error) {
    console.error("Error fetching organization by ID:", error)
    throw new Error("Failed to fetch organization")
  }
}

export async function createOrganizationAction(formData: FormData) {
  const name = formData.get("name")?.toString().trim()
  const url = formData.get("url")?.toString().trim()

  if (!name) return { error: "Name is required" }
  if (!url) return { error: "URL is required" }

  try {
    await prisma.organization.create({ data: { name, url } })
    return { success: true }
  } catch (error: any) {
    console.error("Error creating organization:", error)
    if (error?.code === "P2002") {
      return { error: "Organization with this URL already exists" }
    }
    return { error: "Failed to create organization" }
  }
}

export async function updateOrganizationAction(
  id: string,
  data: { name: string; url: string },
) {
  const name = data.name?.trim()
  const url = data.url?.trim()
  if (!name) return { error: "Name is required" }
  if (!url) return { error: "URL is required" }

  try {
    return await prisma.organization.update({ where: { id }, data: { name, url } })
  } catch (error: any) {
    console.error("Error updating organization:", error)
    if (error?.code === "P2002") {
      return { error: "Organization with this URL already exists" }
    }
    return { error: "Failed to update organization" }
  }
}

export async function deleteOrganizationAction(id: string) {
  try {
    return await prisma.organization.delete({ where: { id } })
  } catch (error) {
    console.error("Error deleting organization:", error)
    return { error: "Failed to delete organization" }
  }
}

export async function createOrganizationMembershipAction(formData: FormData) {
  const organizationId = formData.get("organizationId")?.toString()
  const userId = formData.get("userId")?.toString()
  const jobTitle = formData.get("jobTitle")?.toString() || undefined

  if (!organizationId || !userId) return { error: "Organization and User are required" }

  try {
    await prisma.organizationMembership.create({
      data: { organizationId, userId, jobTitle },
    })
    return { success: true }
  } catch (error: any) {
    console.error("Error creating organization membership:", error)
    if (error?.code === "P2002") {
      return { error: "User is already a member of this organization" }
    }
    return { error: "Failed to add member" }
  }
}

export async function deleteOrganizationMembershipAction(id: string) {
  try {
    await prisma.organizationMembership.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    console.error("Error deleting organization membership:", error)
    return { error: "Failed to remove member" }
  }
}
