"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react"
import { toast } from "sonner"

import {
  publishProductDraftAction,
  saveProductDraftAction,
} from "@/actions/product-drafts/actions"
import { Button } from "@/components/atoms/button"
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { PRODUCT_WIZARD_DROPDOWN_TRIGGER_CLASS } from "@/components/pages/products/_shared/dropdownStyles"
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
  productDraftStepPath,
  productDraftStepSchemas,
  type ProductDraftMode,
  type ProductDraftStep,
} from "@/lib/productWizard/draft"
import { PLATFORMS } from "@/lib/productWizard/constants"
import { adminPath, memberProductUpgradePath } from "@/lib/routes"
import { cn } from "@/lib/utils"
import type {
  ProductWizardAdminUserOption,
  ProductWizardAlternativeOption,
  ProductWizardCategoryOption,
} from "@/types/product-wizard"
import type { ProductWizardInputAdd } from "@/lib/productWizard/schema"

type ProductDraftValues = ProductWizardInputAdd & { ownerId?: string }

type BaseProps = {
  mode: ProductDraftMode
  draftId: string
  productId: string
  step: ProductDraftStep
  initialValues: ProductDraftValues
  categories: ProductWizardCategoryOption[]
}

type MemberProps = BaseProps & {
  mode: "member"
  alternatives: ProductWizardAlternativeOption[]
}

type AdminProps = BaseProps & {
  mode: "admin"
  users: ProductWizardAdminUserOption[]
}

export type ProductDraftStepFormProps = MemberProps | AdminProps

function applyFieldErrors(
  form: ReturnType<typeof useForm<ProductDraftValues>>,
  fieldErrors: Record<string, string> | undefined,
) {
  if (!fieldErrors) return
  Object.entries(fieldErrors).forEach(([field, message]) => {
    form.setError(field as any, { type: "server", message })
  })
}

export default function ProductDraftStepForm(props: ProductDraftStepFormProps) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<
    null | "navigate" | "continue" | "publish"
  >(null)
  const form = useForm<ProductDraftValues>({
    defaultValues: props.initialValues,
    mode: "onBlur",
  })
  const currentIndex = PRODUCT_DRAFT_STEPS.indexOf(props.step)
  const previousStep = getPreviousProductDraftStep(props.step)
  const nextStep = getNextProductDraftStep(props.step)
  const completionPercent = Math.round(
    ((currentIndex + 1) / PRODUCT_DRAFT_STEPS.length) * 100,
  )

  const ownerId = useWatch({
    control: form.control,
    name: "ownerId" as any,
  }) as string | undefined
  const ownerClerkId =
    props.mode === "admin"
      ? ownerId?.length
        ? props.users.find((u) => u.id === ownerId)?.clerkId
        : undefined
      : undefined

  const ownerNode =
    props.mode === "admin" ? (
      <FormField
        control={form.control}
        name={"ownerId" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Owner (user)</FormLabel>
            <Select value={field.value || ""} onValueChange={field.onChange}>
              <SelectTrigger className={PRODUCT_WIZARD_DROPDOWN_TRIGGER_CLASS}>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {props.users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    ) : null

  const stepContent = (() => {
    switch (props.step) {
      case "configuration":
        return (
          <Step1
            categories={props.categories}
            platforms={PLATFORMS as any}
            lockWebsiteUrl={false}
            rightOfWebsite={ownerNode}
            enableAutofill
          />
        )
      case "assets":
        return props.mode === "admin" ? (
          <Step2
            productId={props.productId}
            uploadAsClerkId={ownerClerkId}
            requireUploadAsClerkId
          />
        ) : (
          <Step2 productId={props.productId} />
        )
      case "commercial":
        return <Step3 />
      case "validation":
        return <Step4 productId={props.productId} persistOnVerify={false} />
      case "positioning":
        return (
          <Step5
            alternatives={props.mode === "member" ? props.alternatives : []}
          />
        )
    }
  })()

  function validateCurrentStep(values: ProductDraftValues) {
    form.clearErrors()
    if (
      props.mode === "admin" &&
      props.step === "configuration" &&
      !String(values.ownerId || "").length
    ) {
      form.setError("ownerId" as any, {
        type: "manual",
        message: "Owner is required",
      })
      return false
    }

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

  async function saveDraft(validate: boolean) {
    const values = form.getValues()
    if (validate && !validateCurrentStep(values)) {
      toast.error("Fix the highlighted fields to continue.")
      return false
    }

    const result = await saveProductDraftAction({
      draftId: props.draftId,
      step: props.step,
      values,
      validate,
    })
    if ((result as any)?.error) {
      applyFieldErrors(form, (result as any).fieldErrors)
      toast.error((result as any).error)
      return false
    }

    return true
  }

  async function handleContinue() {
    setPendingAction("continue")
    try {
      const saved = await saveDraft(true)
      if (!saved) return
      if (nextStep) {
        router.push(productDraftStepPath(props.mode, props.draftId, nextStep))
      }
    } finally {
      setPendingAction(null)
    }
  }

  async function handleNavigate(href: string) {
    setPendingAction("navigate")
    try {
      const saved = await saveDraft(false)
      if (!saved) return
      router.push(href)
    } finally {
      setPendingAction(null)
    }
  }

  async function handlePublish() {
    const values = form.getValues()
    if (!validateCurrentStep(values)) {
      toast.error("Fix the highlighted fields before publishing.")
      return
    }

    setPendingAction("publish")
    try {
      const saved = await saveDraft(true)
      if (!saved) return
      const result = await publishProductDraftAction({
        draftId: props.draftId,
        values,
      })
      if ((result as any)?.error) {
        applyFieldErrors(form, (result as any).fieldErrors)
        toast.error((result as any).error)
        return
      }

      toast.success(
        props.mode === "member"
          ? "Product draft created. Select a plan to publish."
          : "Product created successfully.",
      )
      const slug = (result as any)?.slug
      if (props.mode === "member" && slug) {
        router.push(memberProductUpgradePath(slug))
        return
      }
      router.push(adminPath("products"))
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <section className="w-full space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-1 text-[32px] font-bold leading-10 text-black">
            Add product
          </h1>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <div className="flex min-w-[760px] items-center px-4 py-3">
            {PRODUCT_DRAFT_STEPS.map((step, index) => {
              const isActive = step === props.step
              const isComplete = index < currentIndex
              const href = productDraftStepPath(props.mode, props.draftId, step)

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
              void handlePublish()
            }
          }}
        >
          <div className="product-draft-step-content">{stepContent}</div>
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
                  productDraftStepPath(props.mode, props.draftId, previousStep),
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
              onClick={handlePublish}
            >
              {pendingAction === "publish"
                ? props.mode === "member"
                  ? "Creating..."
                  : "Publishing..."
                : props.mode === "member"
                  ? "Continue to Plan Selection"
                  : "Publish Product"}
              <Rocket className="ml-2 size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </footer>
    </section>
  )
}
