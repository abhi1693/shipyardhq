"use server"

import prisma from "@/lib/prisma"
import { Prisma, PlanType } from "@prisma/client"
import { dodoClient } from "@/lib/dodo"

// Get all plans
export async function getPlans(args: Prisma.PlanFindManyArgs = {}) {
  try {
    return await prisma.plan.findMany({
      orderBy: { price: "asc" },
      ...args,
    })
  } catch (error) {
    console.error("Failed to fetch plans:", error)
    throw new Error("Unable to load plans.")
  }
}

export async function createPlanAction(formData: FormData) {
  const name = formData.get("name")!.toString().trim()
  const slug = formData.get("slug")!.toString().trim()
  const description = formData.get("description")?.toString().trim() || null
  const type = PlanType.one_time_price
  const price = parseInt(formData.get("price")!.toString(), 10)
  const discountRaw = formData.get("discount")
  const isDefault =
    formData.get("isDefault") === "true" || formData.get("isDefault") === "on"

  const discount = discountRaw ? parseFloat(discountRaw.toString()) : null

  try {
    const exists = await planSlugExists(slug)
    if (exists) {
      return { error: "A plan with this slug already exists." }
    }

    await prisma.plan.create({
      data: {
        name,
        slug,
        description,
        type,
        price,
        discount: Math.max(0, Math.min(discount ?? 0, 100)),
        isDefault,
      },
    })

    if (price !== 0) {
      // DodoPayments expects discount as percentage
      const pct = Math.max(0, Math.min(discount ?? 0, 100))
      // Create product on DodoPayments
      const product = await dodoClient.products.create({
        price: {
          currency: "USD",
          discount: pct,
          price,
          purchasing_power_parity: true,
          type: "one_time_price",
          tax_inclusive: false,
        },
        tax_category: "saas",
        description,
        name,
      })
      console.log("Product created on DodoPayments:", product.product_id)

      // Update the plan with the DodoPayments product ID in externalId field
      await prisma.plan.update({
        where: { slug },
        data: {
          externalId: product.product_id,
        },
      })
      console.log("Product updated on DodoPayments:", product.product_id)
    }

    return { success: true }
  } catch (error) {
    console.error("❌ Failed to create plan:", error)
    return { error: "Failed to create plan." }
  }
}

// Get a single plan by ID
export async function getPlanById(
  id: string,
  args: Omit<Prisma.PlanFindUniqueArgs, "where"> = {},
) {
  try {
    return await prisma.plan.findUnique({
      where: { id },
      ...args,
    })
  } catch (error) {
    console.error("Failed to fetch plan by ID:", error)
    throw new Error("Unable to load plan.")
  }
}

// Delete a plan by ID
export async function deletePlanAction(id: string) {
  try {
    // Delete product on DodoPayments
    const plan = await prisma.plan.findUnique({
      where: { id },
      select: { externalId: true },
    })
    if (plan?.externalId) {
      await dodoClient.products.delete(plan.externalId)
      console.log("Product deleted on DodoPayments:", plan.externalId)
    }

    await prisma.plan.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    console.error("❌ Failed to delete plan:", error)
    return {
      error: "Failed to delete plan. It may be linked to other records.",
    }
  }
}

async function otherDefaultPlanExists(currentId: string) {
  return prisma.plan.findFirst({
    where: {
      isDefault: true,
      NOT: { id: currentId },
    },
    select: { id: true },
  })
}

async function planSlugExists(slug: string, excludeId?: string) {
  return prisma.plan.findFirst({
    where: {
      slug,
      NOT: { id: excludeId },
    },
    select: { id: true },
  })
}

type UpdatePlanInput = {
  name: string
  slug: string
  description?: string | null
  price: number
  discount?: number | null
  isDefault?: boolean
}

export async function updatePlanAction(id: string, data: UpdatePlanInput) {
  try {
    if (data.isDefault) {
      const existingDefault = await otherDefaultPlanExists(id)
      if (existingDefault) {
        return {
          error:
            "Another default plan already exists. Only one can be default.",
        }
      }
    }

    const slugTaken = await planSlugExists(data.slug, id)
    if (slugTaken) {
      return { error: "Slug already exists. Please use a unique slug." }
    }

    await prisma.plan.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        price: data.price,
        discount: Math.max(0, Math.min(data.discount ?? 0, 100)),
        isDefault: data.isDefault ?? false,
      },
    })

    // Update product on DodoPayments
    const plan = await prisma.plan.findUnique({
      where: { id },
      select: { externalId: true },
    })
    if (plan?.externalId) {
      const pct = Math.max(0, Math.min(data.discount ?? 0, 100))
      await dodoClient.products.update(plan.externalId, {
        price: {
          currency: "USD",
          discount: pct,
          price: data.price,
          purchasing_power_parity: true,
          type: "one_time_price",
          tax_inclusive: false,
        },
        tax_category: "saas",
        description: data.description ?? "",
        name: data.name,
      })
      console.log("Product updated on DodoPayments:", plan.externalId)
    } else {
      if (data.price !== 0) {
        const pct = Math.max(0, Math.min(data.discount ?? 0, 100))
        // Create product on DodoPayments
        const product = await dodoClient.products.create({
          price: {
            currency: "USD",
            discount: pct,
            price: data.price,
            purchasing_power_parity: true,
            type: "one_time_price",
            tax_inclusive: false,
          },
          tax_category: "saas",
          description: data.description,
          name: data.name,
        })
        console.log("Product created on DodoPayments:", product.product_id)

        // Update the plan with the DodoPayments product ID in externalId field
        await prisma.plan.update({
          where: { slug: data.slug },
          data: {
            externalId: product.product_id,
          },
        })
        console.log("Product updated on DodoPayments:", product.product_id)
      }
    }

    return { success: true }
  } catch (error) {
    console.error("❌ Failed to update plan:", error)
    return { error: "Failed to update plan." }
  }
}
