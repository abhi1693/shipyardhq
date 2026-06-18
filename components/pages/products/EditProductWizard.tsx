"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { updateProductAction } from "@/actions/products/actions"
import { Button } from "@/components/atoms/button"
import Step1 from "@/app/(member)/member/products/shared/step1"
import Step2 from "@/app/(member)/member/products/shared/step2"
import Step3 from "@/app/(member)/member/products/shared/step3"
import Step4 from "@/app/(member)/member/products/shared/step4"
import Step5 from "@/app/(member)/member/products/shared/step5"
import {
  getNextProductDraftStep,
  getPreviousProductDraftStep,
  PRODUCT_DRAFT_STEP_META,
  PRODUCT_DRAFT_STEPS,
  productDraftStepSchemas,
  type ProductDraftStep,
} from "@/lib/productWizard/draft"
import { PLATFORMS } from "@/lib/productWizard/constants"
import {
  getInitialValuesFromProduct,
  toUpdatePayload,
} from "@/lib/productWizard/mappers"
import {
  editProductSchema,
  type ProductWizardInputEdit,
} from "@/lib/productWizard/schema"
import { memberProductPath } from "@/lib/routes"
import { cn } from "@/lib/utils"
import type {
  ProductForEditWizard,
  ProductWizardAlternativeOption,
  ProductWizardCategoryOption,
} from "@/types/product-wizard"

type EditProductValues = ProductWizardInputEdit

export type EditProductWizardProps = {
  product: ProductForEditWizard
  categories: ProductWizardCategoryOption[]
  step: ProductDraftStep
  mode: "member"
  alternatives: ProductWizardAlternativeOption[]
}

function productEditStepPath(
  product: ProductForEditWizard,
  step: ProductDraftStep,
) {
  return `${memberProductPath(product.slug)}/edit/${step}`
}

export default function EditProductWizard(props: EditProductWizardProps) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<
    null | "navigate" | "continue" | "save"
  >(null)
  const schema = editProductSchema
  const productAlreadyVerified = Boolean(
    props.product?.verification?.isVerified,
  )
  const initialValues = {
    ...getInitialValuesFromProduct(props.product),
    verificationChecked: productAlreadyVerified,
    verificationSuccess: productAlreadyVerified,
  }
  const form = useForm<EditProductValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialValues,
    mode: "onBlur",
  })
  const currentIndex = PRODUCT_DRAFT_STEPS.indexOf(props.step)
  const previousStep = getPreviousProductDraftStep(props.step)
  const nextStep = getNextProductDraftStep(props.step)
  const completionPercent = Math.round(
    ((currentIndex + 1) / PRODUCT_DRAFT_STEPS.length) * 100,
  )

  const stepContent = (() => {
    switch (props.step) {
      case "configuration":
        return (
          <Step1
            categories={props.categories}
            platforms={PLATFORMS as any}
            lockWebsiteUrl
            enableAutofill
          />
        )
      case "assets":
        return (
          <Step2
            productId={props.product.id}
            productSlug={props.product.slug}
            galleryMedia={
              props.product.ProductMedia?.map((media: any) => ({
                id: media.id,
                imageUrl: media.imageUrl,
              })) ?? []
            }
            canEditGallery
            maxGallery={6}
          />
        )
      case "commercial":
        return <Step3 />
      case "validation":
        return <Step4 productId={props.product.id} persistOnVerify />
      case "positioning":
        return <Step5 alternatives={props.alternatives} />
    }
  })()

  function validateCurrentStep(values: EditProductValues) {
    form.clearErrors()
    const parsed = productDraftStepSchemas[props.step].safeParse(values)
    if (parsed.success) return true

    parsed.error.issues.forEach((issue) => {
      const field = issue.path.join(".")
      if (!field) return
      form.setError(field as any, {
        type: "manual",
        message: issue.message,
      })
    })
    return false
  }

  async function saveProduct(validate: boolean, showSuccess = false) {
    const values = form.getValues()
    if (validate && !validateCurrentStep(values)) {
      toast.error("Fix the highlighted fields to continue.")
      return false
    }

    const fullValidation = schema.safeParse(values)
    if (!fullValidation.success) {
      fullValidation.error.issues.forEach((issue) => {
        const field = issue.path.join(".")
        if (!field) return
        form.setError(field as any, {
          type: "manual",
          message: issue.message,
        })
      })
      toast.error("Fix the highlighted fields to continue.")
      return false
    }

    const result = await updateProductAction(
      props.product.id,
      toUpdatePayload(fullValidation.data as EditProductValues),
    )
    if ((result as any)?.error) {
      toast.error((result as any).error)
      return false
    }

    form.reset(values)
    if (showSuccess) toast.success("Product updated successfully.")
    return true
  }

  async function handleContinue() {
    setPendingAction("continue")
    try {
      const saved = await saveProduct(true)
      if (!saved) return
      if (nextStep) {
        router.push(productEditStepPath(props.product, nextStep))
      }
    } finally {
      setPendingAction(null)
    }
  }

  async function handleNavigate(href: string) {
    setPendingAction("navigate")
    try {
      const saved = await saveProduct(false)
      if (!saved) return
      router.push(href)
    } finally {
      setPendingAction(null)
    }
  }

  async function handleSave() {
    setPendingAction("save")
    try {
      const saved = await saveProduct(true, true)
      if (!saved) return
      router.push(memberProductPath(props.product.slug))
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <section className="w-full space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-1 text-[32px] font-bold leading-10 text-black">
            Edit product
          </h1>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <div className="flex min-w-[760px] items-center px-4 py-3">
            {PRODUCT_DRAFT_STEPS.map((step, index) => {
              const isActive = step === props.step
              const isComplete = index < currentIndex
              const href = productEditStepPath(props.product, step)

              return (
                <div key={step} className="flex flex-1 items-center">
                  <button
                    type="button"
                    className={cn(
                      "flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                      pendingAction
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-pointer",
                      isActive
                        ? "bg-[#eff4ff] text-[#0051d5]"
                        : "text-[#43474c] hover:bg-[#F8FAFC] hover:text-black",
                    )}
                    disabled={Boolean(pendingAction)}
                    onClick={() => {
                      if (isActive) return
                      void handleNavigate(href)
                    }}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded text-[11px] font-bold",
                        isActive
                          ? "bg-[#0051d5] text-white"
                          : isComplete
                            ? "bg-black text-white"
                            : "border border-[#E2E8F0] bg-white text-[#74777d]",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="truncate text-[12px] font-bold uppercase tracking-[0.05em]">
                      {PRODUCT_DRAFT_STEP_META[step].label}
                    </span>
                  </button>
                  {index < PRODUCT_DRAFT_STEPS.length - 1 ? (
                    <div className="mx-2 h-px flex-1 bg-[#E2E8F0]" />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="h-1 bg-[#eff4ff]">
          <div
            className="h-full bg-[#0051d5] transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      <FormProvider {...form}>
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (nextStep) {
              void handleContinue()
            } else {
              void handleSave()
            }
          }}
        >
          <div className="product-edit-step-content">{stepContent}</div>
        </form>
      </FormProvider>

      <footer className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-6 md:flex-row md:items-center md:justify-between">
        <div>
          {previousStep ? (
            <Button
              type="button"
              variant="outline"
              className="border-[#E2E8F0] text-sm font-semibold text-[#43474c]"
              disabled={Boolean(pendingAction)}
              onClick={() => {
                void handleNavigate(
                  productEditStepPath(props.product, previousStep),
                )
              }}
            >
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Previous
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          {nextStep ? (
            <Button
              type="button"
              className="bg-black text-sm font-bold text-white hover:bg-black/90"
              disabled={Boolean(pendingAction)}
              onClick={handleContinue}
            >
              {pendingAction === "continue"
                ? "Saving..."
                : `Continue to ${PRODUCT_DRAFT_STEP_META[nextStep].label}`}
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              className="bg-black text-sm font-bold text-white hover:bg-black/90"
              disabled={Boolean(pendingAction)}
              onClick={handleSave}
            >
              {pendingAction === "save" ? "Saving..." : "Save Changes"}
              <Rocket className="ml-2 size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </footer>
    </section>
  )
}
