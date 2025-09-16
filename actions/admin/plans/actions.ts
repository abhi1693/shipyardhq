"use server"

import prisma from "@/lib/prisma"
import { Prisma, PlanType, TimeInterval } from "@/lib/vendor/prisma/client"
import { dodoClient } from "@/lib/dodo"

function normalizeDiscount(value: unknown): number | null {
  if (value === null || value === undefined) return null

  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseFloat(value)
        : Number(value)

  if (!Number.isFinite(raw)) return null

  return Math.max(0, Math.min(raw, 100))
}

// Map interval to Dodo's expected enum casing
const toDodoInterval = (iv: TimeInterval | string | null | undefined) => {
  switch ((iv || "").toString().toLowerCase()) {
    case "day":
      return "Day"
    case "week":
      return "Week"
    case "month":
      return "Month"
    case "year":
      return "Year"
    default:
      return undefined
  }
}

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
  const typeRaw = formData.get("type")?.toString() || PlanType.one_time_price
  const type = (Object.values(PlanType) as string[]).includes(typeRaw)
    ? (typeRaw as PlanType)
    : PlanType.one_time_price
  const price = parseInt(formData.get("price")!.toString(), 10)
  const discountRaw = formData.get("discount")
  const boostForDaysRaw = formData.get("boostForDays")
  const isDefault =
    formData.get("isDefault") === "true" || formData.get("isDefault") === "on"

  const paymentFrequencyCountRaw = formData.get("paymentFrequencyCount")
  const paymentFrequencyIntervalRaw = formData
    .get("paymentFrequencyInterval")
    ?.toString()
  const subscriptionPeriodCountRaw = formData.get("subscriptionPeriodCount")
  const subscriptionPeriodIntervalRaw = formData
    .get("subscriptionPeriodInterval")
    ?.toString()

  const discount = normalizeDiscount(discountRaw)
  const boostForDays = boostForDaysRaw
    ? Math.max(1, Math.min(30, parseInt(boostForDaysRaw.toString(), 10) || 1))
    : 1
  const paymentFrequencyCount = paymentFrequencyCountRaw
    ? parseInt(paymentFrequencyCountRaw.toString(), 10)
    : null
  const paymentFrequencyInterval =
    paymentFrequencyIntervalRaw &&
    (Object.values(TimeInterval) as string[]).includes(
      paymentFrequencyIntervalRaw,
    )
      ? (paymentFrequencyIntervalRaw as TimeInterval)
      : null
  const subscriptionPeriodCount = subscriptionPeriodCountRaw
    ? parseInt(subscriptionPeriodCountRaw.toString(), 10)
    : null
  const subscriptionPeriodInterval =
    subscriptionPeriodIntervalRaw &&
    (Object.values(TimeInterval) as string[]).includes(
      subscriptionPeriodIntervalRaw,
    )
      ? (subscriptionPeriodIntervalRaw as TimeInterval)
      : null

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
        discount,
        boostForDays,
        isDefault,
        paymentFrequencyCount,
        paymentFrequencyInterval,
        subscriptionPeriodCount,
        subscriptionPeriodInterval,
      },
    })

    if (price !== 0) {
      const pct = discount ?? 0
      const pricePayload: any = {
        currency: "USD",
        discount: pct,
        price,
        purchasing_power_parity: true,
        type:
          type === PlanType.recurring_price
            ? "recurring_price"
            : "one_time_price",
        tax_inclusive: false,
      }
      if (type === PlanType.recurring_price) {
        pricePayload.payment_frequency_count = paymentFrequencyCount ?? 1
        pricePayload.payment_frequency_interval =
          toDodoInterval(paymentFrequencyInterval) || "Month"
        pricePayload.subscription_period_count =
          subscriptionPeriodCount ?? paymentFrequencyCount ?? 1
        pricePayload.subscription_period_interval =
          toDodoInterval(subscriptionPeriodInterval) ||
          toDodoInterval(paymentFrequencyInterval) ||
          "Month"
      }

      const product = await dodoClient.products.create({
        price: pricePayload,
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
      await dodoClient.products.archive(plan.externalId)
      console.log("Product archived on DodoPayments:", plan.externalId)
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
  boostForDays?: number | null
  isDefault?: boolean
  type?: PlanType
  paymentFrequencyCount?: number | null
  paymentFrequencyInterval?: TimeInterval | null
  subscriptionPeriodCount?: number | null
  subscriptionPeriodInterval?: TimeInterval | null
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

    const discount = normalizeDiscount(data.discount)

    await prisma.plan.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        price: data.price,
        discount,
        boostForDays: Math.max(1, Math.min(data.boostForDays ?? 1, 30)),
        isDefault: data.isDefault ?? false,
        type: data.type ?? PlanType.one_time_price,
        paymentFrequencyCount: data.paymentFrequencyCount ?? null,
        paymentFrequencyInterval: data.paymentFrequencyInterval ?? null,
        subscriptionPeriodCount: data.subscriptionPeriodCount ?? null,
        subscriptionPeriodInterval: data.subscriptionPeriodInterval ?? null,
      },
    })

    // Update product on DodoPayments
    const plan = await prisma.plan.findUnique({
      where: { id },
      select: { externalId: true },
    })
    if (plan?.externalId) {
      const pct = discount ?? 0
      const pricePayload: any = {
        currency: "USD",
        discount: pct,
        price: data.price,
        purchasing_power_parity: true,
        type:
          (data.type ?? PlanType.one_time_price) === PlanType.recurring_price
            ? "recurring_price"
            : "one_time_price",
        tax_inclusive: false,
      }
      if ((data.type ?? PlanType.one_time_price) === PlanType.recurring_price) {
        pricePayload.payment_frequency_count = data.paymentFrequencyCount ?? 1
        pricePayload.payment_frequency_interval =
          toDodoInterval(data.paymentFrequencyInterval as any) || "Month"
        pricePayload.subscription_period_count =
          data.subscriptionPeriodCount ?? data.paymentFrequencyCount ?? 1
        pricePayload.subscription_period_interval =
          toDodoInterval(data.subscriptionPeriodInterval as any) ||
          toDodoInterval(data.paymentFrequencyInterval as any) ||
          "Month"
      }

      await dodoClient.products.update(plan.externalId, {
        price: pricePayload,
        tax_category: "saas",
        description: data.description ?? "",
        name: data.name,
      })
      console.log("Product updated on DodoPayments:", plan.externalId)
    } else {
      if (data.price !== 0) {
        const pct = discount ?? 0
        const pricePayload: any = {
          currency: "USD",
          discount: pct,
          price: data.price,
          purchasing_power_parity: true,
          type:
            (data.type ?? PlanType.one_time_price) === PlanType.recurring_price
              ? "recurring_price"
              : "one_time_price",
          tax_inclusive: false,
        }
        if (
          (data.type ?? PlanType.one_time_price) === PlanType.recurring_price
        ) {
          pricePayload.payment_frequency_count = data.paymentFrequencyCount ?? 1
          pricePayload.payment_frequency_interval =
            toDodoInterval(data.paymentFrequencyInterval as any) || "Month"
          pricePayload.subscription_period_count =
            data.subscriptionPeriodCount ?? data.paymentFrequencyCount ?? 1
          pricePayload.subscription_period_interval =
            toDodoInterval(data.subscriptionPeriodInterval as any) ||
            toDodoInterval(data.paymentFrequencyInterval as any) ||
            "Month"
        }

        // Create product on DodoPayments
        const product = await dodoClient.products.create({
          price: pricePayload,
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
