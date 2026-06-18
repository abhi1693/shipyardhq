"use server"

import { auth } from "@clerk/nextjs/server"

import { createProductAction } from "@/actions/products/actions"
import prisma from "@/lib/prisma"
import {
  mergeDraftPayload,
  productDraftStepSchemas,
  type ProductDraftMode,
  type ProductDraftStep,
} from "@/lib/productWizard/draft"
import { toCreateFormData } from "@/lib/productWizard/mappers"
import {
  addProductSchema,
  type ProductWizardInputAdd,
} from "@/lib/productWizard/schema"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"

function makeDraftProductId() {
  const rand = () => Math.random().toString(36).slice(2, 10)
  return `prod_${Date.now().toString(36)}_${rand()}_${rand()}`
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefined)
  }
  if (!value || typeof value !== "object") {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefined(entry)]),
  )
}

async function getCurrentDraftUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" as const, user: null }

  const user = await getActiveUserByClerkId(clerkId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE, user: null }

  return { error: null, user }
}

export async function createProductDraft(mode: ProductDraftMode) {
  const { error, user } = await getCurrentDraftUser()
  if (error || !user) return { error }

  const draft = await prisma.productDraft.create({
    data: {
      userId: user.id,
      mode,
      productId: makeDraftProductId(),
      currentStep: "configuration",
      payload: {},
    },
    select: { id: true },
  })

  return { draftId: draft.id }
}

export async function getProductDraftForCurrentUser(
  draftId: string,
  mode: ProductDraftMode,
) {
  const { error, user } = await getCurrentDraftUser()
  if (error || !user) return null

  return prisma.productDraft.findFirst({
    where: {
      id: draftId,
      userId: user.id,
      mode,
    },
    select: {
      id: true,
      productId: true,
      mode: true,
      currentStep: true,
      payload: true,
      updatedAt: true,
    },
  })
}

export async function saveProductDraftAction(input: {
  draftId: string
  step: ProductDraftStep
  values: Record<string, unknown>
  validate?: boolean
}) {
  const { error, user } = await getCurrentDraftUser()
  if (error || !user) return { error }

  const draft = await prisma.productDraft.findFirst({
    where: { id: input.draftId, userId: user.id },
    select: { id: true, mode: true, payload: true },
  })
  if (!draft) return { error: "Draft not found" }

  const merged = {
    ...mergeDraftPayload(draft.payload),
    ...input.values,
  }
  if (input.validate !== false) {
    const stepSchema = productDraftStepSchemas[input.step]
    const parsed = stepSchema.safeParse(merged)
    if (!parsed.success) {
      return {
        error: "Fix the highlighted fields to continue.",
        fieldErrors: Object.fromEntries(
          parsed.error.issues.map((issue) => [
            issue.path.join("."),
            issue.message,
          ]),
        ),
      }
    }
  }

  await prisma.productDraft.update({
    where: { id: input.draftId },
    data: {
      currentStep: input.step,
      payload: stripUndefined(merged) as any,
    },
  })

  return { success: true }
}

export async function publishProductDraftAction(input: {
  draftId: string
  values: Record<string, unknown>
}) {
  const { error, user } = await getCurrentDraftUser()
  if (error || !user) return { error }

  const draft = await prisma.productDraft.findFirst({
    where: { id: input.draftId, userId: user.id },
    select: {
      id: true,
      productId: true,
      mode: true,
      payload: true,
    },
  })
  if (!draft) return { error: "Draft not found" }

  const nextStatus = "draft"
  const merged = {
    ...mergeDraftPayload(draft.payload),
    ...input.values,
    status: nextStatus,
  }

  const parsed = addProductSchema.safeParse(merged)
  if (!parsed.success) {
    return {
      error: "Fix the highlighted fields before publishing.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join("."),
          issue.message,
        ]),
      ),
    }
  }

  const values = parsed.data as ProductWizardInputAdd

  const fd = toCreateFormData(
    { ...values, status: nextStatus },
    user.id,
    draft.productId,
  )
  const result = await createProductAction(fd)
  if ((result as any)?.error) return result as any

  await prisma.productDraft.delete({ where: { id: draft.id } }).catch(() => {})
  return result as any
}
