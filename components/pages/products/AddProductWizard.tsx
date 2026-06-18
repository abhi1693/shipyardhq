"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import {
  BadgeDollarSign,
  Check,
  ImageIcon,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { createProductAction } from "@/actions/admin/products/actions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form"
import ProductBadgeCelebrationDialog from "@/components/molecules/ProductBadgeCelebrationDialog"
import ProductWizardAccordion from "@/components/pages/products/_components/ProductWizardAccordion"
import ProductWizardFooter from "@/components/pages/products/_components/ProductWizardFooter"
import { PRODUCT_AUTOFILL_NOTICE } from "@/components/pages/products/_shared/autofillText"
import { PRODUCT_WIZARD_DROPDOWN_TRIGGER_CLASS } from "@/components/pages/products/_shared/dropdownStyles"
import {
  useWizardNavigation,
  type WizardBoostPanel,
  type WizardSectionKey,
} from "@/components/pages/products/_shared/wizardNavigation"
import Step1 from "@/app/(member)/member/products/shared/step1"
import Step2 from "@/app/(member)/member/products/shared/step2"
import Step3 from "@/app/(member)/member/products/shared/step3"
import Step4 from "@/app/(member)/member/products/shared/step4"
import Step5 from "@/app/(member)/member/products/shared/step5"
import { PLATFORMS } from "@/lib/productWizard/constants"
import {
  getInitialValuesForAdd,
  toCreateFormData,
} from "@/lib/productWizard/mappers"
import {
  addProductSchema,
  makeAdminAddProductSchema,
} from "@/lib/productWizard/schema"
import {
  adminPath,
  MEMBER_PRODUCTS_PATH,
  memberProductUpgradePath,
  productPath,
} from "@/lib/routes"
import type {
  ProductWizardAdminUserOption,
  ProductWizardAlternativeOption,
  ProductWizardCategoryOption,
} from "@/types/product-wizard"
import type { ProductWizardInputAdd } from "@/lib/productWizard/schema"
import { cn } from "@/lib/utils"

type BaseProps = {
  categories: ProductWizardCategoryOption[]
}

type MemberProps = BaseProps & {
  mode: "member"
  userId: string
  alternatives: ProductWizardAlternativeOption[]
}

type AdminProps = BaseProps & {
  mode: "admin"
  users: ProductWizardAdminUserOption[]
}

export type AddProductWizardProps = MemberProps | AdminProps

export type ProductWizardInput = ProductWizardInputAdd

const WIZARD_PHASES: {
  key: WizardSectionKey
  number: string
  label: string
  description: string
  Icon: LucideIcon
}[] = [
  {
    key: "core",
    number: "01",
    label: "Configuration",
    description: "URL, category, and product story",
    Icon: Settings2,
  },
  {
    key: "media",
    number: "02",
    label: "Assets",
    description: "Logo, banner, and screenshots",
    Icon: ImageIcon,
  },
  {
    key: "pricing",
    number: "03",
    label: "Commercial",
    description: "Pricing model and launch economics",
    Icon: BadgeDollarSign,
  },
  {
    key: "boost",
    number: "04",
    label: "Validation",
    description: "Domain trust and verification",
    Icon: ShieldCheck,
  },
  {
    key: "details",
    number: "05",
    label: "Positioning",
    description: "Links, campaigns, and alternatives",
    Icon: SlidersHorizontal,
  },
]

function makeClientProductId() {
  const g: any = typeof globalThis !== "undefined" ? (globalThis as any) : {}
  const c = g.crypto as Crypto | undefined
  if (c && typeof (c as any).randomUUID === "function") {
    return (c as any).randomUUID()
  }
  const rand = () => Math.random().toString(36).slice(2, 10)
  return `prod_${Date.now().toString(36)}_${rand()}_${rand()}`
}

export default function AddProductWizard(props: AddProductWizardProps) {
  const router = useRouter()
  const schema =
    props.mode === "admin" ? makeAdminAddProductSchema() : addProductSchema
  const {
    openSections,
    setOpenSections,
    openBoostPanel,
    toggleBoostPanel,
    jumpTo,
    openFromErrors,
  } = useWizardNavigation()

  const [newProductId] = useState(makeClientProductId)
  const form = useForm<ProductWizardInput & { ownerId?: string }>({
    resolver: zodResolver(schema) as any,
    defaultValues: getInitialValuesForAdd(),
    mode: "onBlur",
  })

  const [showCelebration, setShowCelebration] = useState(false)
  const [isCompletionPending, setIsCompletionPending] = useState(false)
  const [celebrationProductSlug, setCelebrationProductSlug] = useState<
    string | null
  >(null)
  const [activeSection, setActiveSection] = useState<WizardSectionKey>("core")

  const ownerId = useWatch({
    control: form.control,
    name: "ownerId" as any,
  }) as string | undefined

  const domainChecked = useWatch({
    control: form.control,
    name: "verificationChecked" as any,
  }) as boolean | undefined
  const domainVerified = useWatch({
    control: form.control,
    name: "verificationSuccess" as any,
  }) as boolean | undefined

  const pricingModel = useWatch({
    control: form.control,
    name: "pricingModel" as any,
  }) as string | undefined
  const startingPriceCents = useWatch({
    control: form.control,
    name: "startingPriceCents" as any,
  }) as number | undefined
  const currencyCode = useWatch({
    control: form.control,
    name: "currencyCode" as any,
  }) as string | undefined
  const galleryUrls = useWatch({
    control: form.control,
    name: "galleryMedia" as any,
  }) as string[] | undefined
  const galleryCount = Array.isArray(galleryUrls) ? galleryUrls.length : 0
  const activePhaseIndex = Math.max(
    0,
    WIZARD_PHASES.findIndex((phase) => phase.key === activeSection),
  )
  const completionPercent = Math.round(
    ((activePhaseIndex + 1) / WIZARD_PHASES.length) * 100,
  )

  const ownerClerkId =
    props.mode === "admin"
      ? ownerId?.length
        ? props.users.find((u) => u.id === ownerId)?.clerkId
        : undefined
      : undefined

  async function submitAll(
    values: ProductWizardInput & {
      status?: "draft" | "published"
      ownerId?: string
    },
  ) {
    try {
      if (props.mode === "admin") {
        const nextOwnerId = values.ownerId ?? ""
        const fd = toCreateFormData(values, nextOwnerId, newProductId)
        const result = await createProductAction(fd)
        if ((result as any)?.error) {
          toast.error((result as any).error)
          return
        }
        const nextSlug =
          typeof (result as any)?.slug === "string" &&
          (result as any).slug.length
            ? (result as any).slug
            : null
        setCelebrationProductSlug(nextSlug)
        toast.success("Product created successfully!")
        setIsCompletionPending(true)
        setShowCelebration(true)
        return
      }

      const fd = toCreateFormData(
        { ...values, status: "draft" },
        props.userId,
        newProductId,
      )
      const result = await createProductAction(fd)
      if ((result as any)?.error) {
        toast.error((result as any).error)
        return
      }
      toast.success("Product draft created. Select a plan to publish.")
      const slug = (result as any)?.slug
      if (slug) {
        router.push(memberProductUpgradePath(slug))
        return
      }
      router.push(MEMBER_PRODUCTS_PATH)
    } catch (e: any) {
      toast.error(e?.message || "Failed to create product")
    }
  }

  const needsPricingDetails =
    pricingModel === "subscription" || pricingModel === "one_time"
  const missingPricingDetails =
    needsPricingDetails && (!startingPriceCents || !currencyCode)

  function handleOpenSectionsChange(next: WizardSectionKey[]) {
    const added = next.find((section) => !openSections.includes(section))
    if (added) {
      setActiveSection(added)
    } else if (!next.includes(activeSection)) {
      setActiveSection(next[0] ?? "core")
    }
    setOpenSections(next)
  }

  function goToSection(
    section: WizardSectionKey,
    opts?: { boostPanel?: Exclude<WizardBoostPanel, null> },
  ) {
    setActiveSection(section)
    jumpTo(section, opts)
  }

  const smartNextAction = (() => {
    if (props.mode === "admin" && !ownerId?.length) {
      return { label: "Select an owner", onClick: () => goToSection("core") }
    }
    if (missingPricingDetails) {
      return { label: "Set pricing", onClick: () => goToSection("pricing") }
    }
    if (!domainVerified) {
      return {
        label: "Verify domain (badge)",
        onClick: () => goToSection("boost", { boostPanel: "domain" }),
      }
    }
    if (galleryCount < 3) {
      return {
        label: "Add screenshots (3+)",
        onClick: () => goToSection("media"),
      }
    }
    return null
  })()

  const submitWithStatus = (status: "draft" | "published") =>
    form.handleSubmit(
      async (values) => {
        await submitAll({ ...values, status })
      },
      (errors) => {
        openFromErrors(errors as any)
        toast.error("Fix the highlighted fields to continue.")
      },
    )

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

  const core = (
    <Step1
      categories={props.categories}
      platforms={PLATFORMS as any}
      lockWebsiteUrl={false}
      rightOfWebsite={ownerNode}
      enableAutofill
      autofillNotice={PRODUCT_AUTOFILL_NOTICE}
    />
  )
  const media =
    props.mode === "admin" ? (
      <Step2
        productId={newProductId}
        uploadAsClerkId={ownerClerkId}
        requireUploadAsClerkId
      />
    ) : (
      <Step2 productId={newProductId} />
    )
  const pricing = <Step3 />
  const verification = (
    <Step4 productId={newProductId} persistOnVerify={false} />
  )
  const details = (
    <Step5 alternatives={props.mode === "member" ? props.alternatives : []} />
  )

  const detailsSubcopy =
    props.mode === "member"
      ? "Social links and competitor alternatives."
      : "Social links and positioning details."
  const formId =
    props.mode === "admin" ? "admin-add-product-form" : "add-product-form"

  return (
    <>
      <div className="relative mx-auto w-full max-w-[1040px] pb-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 rounded-xl bg-[radial-gradient(rgba(0,81,213,0.07)_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="mb-8">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
            <div className="grid gap-px bg-slate-200 md:grid-cols-5">
              {WIZARD_PHASES.map((phase, index) => {
                const isActive = phase.key === activeSection
                const isComplete = index < activePhaseIndex
                const Icon = phase.Icon

                return (
                  <button
                    key={phase.key}
                    type="button"
                    className={cn(
                      "group flex min-h-[112px] flex-col items-start gap-3 bg-white p-4 text-left transition-colors hover:bg-slate-50",
                      isActive && "bg-blue-50/70",
                    )}
                    onClick={() => goToSection(phase.key)}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-black",
                          isComplete
                            ? "border-green-600 bg-green-600 text-white"
                            : isActive
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 bg-slate-100 text-slate-500",
                        )}
                      >
                        {isComplete ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          phase.number
                        )}
                      </span>
                      <Icon
                        className={cn(
                          "h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-700",
                          isActive && "text-blue-600",
                          isComplete && "text-green-600",
                        )}
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <div
                        className={cn(
                          "text-xs font-extrabold uppercase tracking-[0.12em] text-slate-800",
                          isActive && "text-blue-700",
                        )}
                      >
                        {phase.label}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {phase.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Current Provisioning
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {WIZARD_PHASES[activePhaseIndex]?.label ?? "Configuration"}
                </p>
              </div>
              <div className="flex min-w-[220px] items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {completionPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
          <FormProvider {...form}>
            <form
              id={formId}
              onSubmit={submitWithStatus("published")}
              className="space-y-6"
            >
              <ProductWizardAccordion
                openSections={openSections}
                onOpenSectionsChange={handleOpenSectionsChange}
                openBoostPanel={openBoostPanel}
                onToggleBoostPanel={toggleBoostPanel}
                domainChecked={Boolean(domainChecked)}
                domainVerified={Boolean(domainVerified)}
                core={core}
                media={media}
                pricing={pricing}
                verification={verification}
                details={details}
                detailsSubcopy={detailsSubcopy}
              />
            </form>
          </FormProvider>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.06)] backdrop-blur md:-mx-6 md:px-6">
        <div className="mx-auto w-full max-w-[1040px]">
          <ProductWizardFooter
            formId={formId}
            isSubmitting={form.formState.isSubmitting}
            smartNextAction={smartNextAction}
            publishLabel="Complete Product Provisioning"
            publishingLabel="Provisioning…"
          />
        </div>
      </div>

      {props.mode === "admin" ? (
        <ProductBadgeCelebrationDialog
          open={showCelebration}
          onOpenChange={(open) => {
            setShowCelebration(open)
            if (!open) {
              setCelebrationProductSlug(null)
              if (isCompletionPending) {
                setIsCompletionPending(false)
                router.push(adminPath("products"))
              }
            }
          }}
          productPublicPath={
            celebrationProductSlug
              ? productPath(celebrationProductSlug)
              : undefined
          }
        />
      ) : null}
    </>
  )
}
