"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  FormProvider,
  useForm,
  useFormState,
  useWatch,
  type UseFormReturn,
} from "react-hook-form"
import { toast } from "sonner"
import { ChevronDown, Info } from "lucide-react"

import { createProductAction } from "@/actions/admin/products/actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { Badge } from "@/components/atoms/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Label } from "@/components/atoms/label"
import Step1 from "@/app/(member)/member/products/shared/step1"
import Step2 from "@/app/(member)/member/products/shared/step2"
import Step3 from "@/app/(member)/member/products/shared/step3"
import Step4 from "@/app/(member)/member/products/shared/step4"
import Step5 from "@/app/(member)/member/products/shared/step5"
import { PaymentConnectorCard } from "@/app/(member)/member/products/shared/PaymentConnectorCard"
import ProductBadgeCelebrationDialog from "@/components/molecules/ProductBadgeCelebrationDialog"
import { PLATFORMS } from "@/lib/productWizard/constants"
import {
  getInitialValuesForAdd,
  toCreateFormData,
} from "@/lib/productWizard/mappers"
import {
  makeAddProductSchema,
  type ProductWizardInputAdd,
} from "@/lib/productWizard/schema"
import {
  adminPath,
  MEMBER_PRODUCTS_PATH,
  memberProductUpgradePath,
  productPath,
} from "@/lib/routes"
import type { PaymentConnectorProvider as PaymentConnectorProviderType } from "@/lib/vendor/prisma/client/enums"

type AlternativeProduct = {
  id: string
  slug?: string | null
  name: string
  websiteUrl?: string | null
}

type BaseProps = {
  categories: { id: string; name: string; icon?: string | null }[]
  organizations: { id: string; name: string }[]
}

type MemberProps = BaseProps & {
  mode: "member"
  userId: string
  alternatives: AlternativeProduct[]
}

type AdminProps = BaseProps & {
  mode: "admin"
  users: { id: string; email: string; clerkId: string }[]
}

export type AddProductWizardProps = MemberProps | AdminProps

function ConnectorFields({ form }: { form: UseFormReturn<ProductWizardInput> }) {
  const { errors } = useFormState({ control: form.control })
  const provider = useWatch({
    control: form.control,
    name: "connectorProvider" as any,
  }) as PaymentConnectorProviderType | undefined
  const apiKey =
    (useWatch({
      control: form.control,
      name: "connectorApiKey" as any,
    }) as string | undefined) ?? ""
  const accountId =
    (useWatch({
      control: form.control,
      name: "connectorAccountId" as any,
    }) as string | undefined) ?? ""
  const brandId =
    (useWatch({
      control: form.control,
      name: "connectorBrandId" as any,
    }) as string | undefined) ?? ""

  return (
    <PaymentConnectorCard
      provider={provider}
      apiKey={apiKey ?? ""}
      accountId={accountId ?? ""}
      brandId={brandId ?? ""}
      showSaveButton={false}
      onChange={(draft) => {
        if (draft.provider) {
          form.setValue("connectorProvider" as any, draft.provider, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        if (draft.apiKey !== undefined) {
          form.setValue("connectorApiKey" as any, draft.apiKey ?? "", {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        if (draft.accountId !== undefined) {
          form.setValue("connectorAccountId" as any, draft.accountId ?? "", {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        if (draft.brandId !== undefined) {
          form.setValue("connectorBrandId" as any, draft.brandId ?? "", {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      }}
      errors={{
        provider: (errors as any)?.connectorProvider?.message as
          | string
          | undefined,
        apiKey: (errors as any)?.connectorApiKey?.message as string | undefined,
        accountId: (errors as any)?.connectorAccountId?.message as
          | string
          | undefined,
        brandId: (errors as any)?.connectorBrandId?.message as
          | string
          | undefined,
      }}
    />
  )
}

const schema = makeAddProductSchema()

export type ProductWizardInput = ProductWizardInputAdd

type SectionKey = "core" | "media" | "pricing" | "boost" | "details"

const INFO_TRIGGER_CLASS =
  "inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

const SECTION_FIELDS: Record<SectionKey, readonly string[]> = {
  core: [
    "websiteUrl",
    "name",
    "tagline",
    "description",
    "categoryId",
    "type",
    "platforms",
    "keywordsText",
  ],
  media: ["logo", "bannerImage"],
  pricing: ["pricingModel", "startingPriceCents", "currencyCode"],
  boost: [
    "connectorProvider",
    "connectorApiKey",
    "connectorAccountId",
    "connectorBrandId",
    "verificationExpectedTxt",
    "verificationChecked",
    "verificationSuccess",
  ],
  details: [
    "organizationId",
    "githubUrl",
    "twitterUrl",
    "demoUrl",
    "contactEmail",
    "utmCampaign",
    "alternativeIds",
  ],
}

function getSectionsForErrorFields(fields: readonly string[]): SectionKey[] {
  const sections: SectionKey[] = []
  const fieldSet = new Set(fields)
  ;(Object.keys(SECTION_FIELDS) as SectionKey[]).forEach((section) => {
    const hasAny = SECTION_FIELDS[section].some((f) => fieldSet.has(f))
    if (hasAny) sections.push(section)
  })
  return sections.length ? sections : ["core"]
}

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
  const [openSections, setOpenSections] = useState<SectionKey[]>([
    "core",
    "media",
    "pricing",
  ])
  const [openBoostPanel, setOpenBoostPanel] = useState<null | "revenue" | "domain">(
    null,
  )

  const [newProductId] = useState(makeClientProductId)

  const [ownerId, setOwnerId] = useState("")
  const [showCelebration, setShowCelebration] = useState(false)
  const [isCompletionPending, setIsCompletionPending] = useState(false)
  const [celebrationProductSlug, setCelebrationProductSlug] = useState<
    string | null
  >(null)

  const form = useForm<ProductWizardInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: getInitialValuesForAdd(),
    mode: "onBlur",
  })

  const connectorProvider = useWatch({
    control: form.control,
    name: "connectorProvider" as any,
  }) as string | undefined
  const connectorApiKey = useWatch({
    control: form.control,
    name: "connectorApiKey" as any,
  }) as string | undefined
  const domainChecked = useWatch({
    control: form.control,
    name: "verificationChecked" as any,
  }) as boolean | undefined
  const domainVerified = useWatch({
    control: form.control,
    name: "verificationSuccess" as any,
  }) as boolean | undefined

  const hasRevenueSetupDraft = Boolean(connectorProvider && connectorApiKey?.length)
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

  const ownerClerkId =
    props.mode === "admin"
      ? ownerId
        ? props.users.find((u) => u.id === ownerId)?.clerkId
        : undefined
      : undefined

  const connectorFields = useMemo(() => {
    return <ConnectorFields form={form} />
  }, [form])

  function toggleBoostPanel(panel: "revenue" | "domain") {
    setOpenBoostPanel((prev) => (prev === panel ? null : panel))
  }

  function setBoostPanel(panel: null | "revenue" | "domain") {
    setOpenBoostPanel(panel)
  }

  function jumpTo(
    section: SectionKey,
    opts?: { boostPanel?: "revenue" | "domain" },
  ) {
    setOpenSections((prev) => Array.from(new Set([...(prev || []), section])))
    if (section === "boost" && opts?.boostPanel) {
      setBoostPanel(opts.boostPanel)
    }
    requestAnimationFrame(() => {
      const node = document.getElementById(`section-${section}`)
      node?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  async function submitAll(
    values: ProductWizardInput & { status?: "draft" | "published" },
  ) {
    try {
      if (props.mode === "admin") {
        if (!ownerId) {
          toast.error("Please select an owner")
          jumpTo("core")
          return
        }
        const fd = toCreateFormData(values as any, ownerId, newProductId)
        const result = await createProductAction(fd)
        if ((result as any)?.error) {
          toast.error((result as any).error)
          return
        }
        const nextSlug =
          typeof (result as any)?.slug === "string" && (result as any).slug.length
            ? (result as any).slug
            : null
        setCelebrationProductSlug(nextSlug)
        toast.success("Product created successfully!")
        setIsCompletionPending(true)
        setShowCelebration(true)
        return
      }

      const fd = toCreateFormData(values, props.userId, newProductId)
      const result = await createProductAction(fd)
      if ((result as any)?.error) {
        toast.error((result as any).error)
        return
      }
      toast.success("Product created successfully!")
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

  function openFromErrors(errors: Record<string, any>) {
    const keys = Object.keys(errors)
    const sectionsToOpen = getSectionsForErrorFields(keys)
    setOpenSections((prev) =>
      Array.from(new Set([...(prev || []), ...(sectionsToOpen as SectionKey[])])),
    )
    if (sectionsToOpen.includes("boost")) {
      const hasRevenueError = keys.some((k) => k.startsWith("connector"))
      const hasDomainError = keys.some((k) => k.startsWith("verification"))
      if (hasRevenueError) setBoostPanel("revenue")
      else if (hasDomainError) setBoostPanel("domain")
    }
  }

  const needsPricingDetails =
    pricingModel === "subscription" || pricingModel === "one_time"
  const missingPricingDetails =
    needsPricingDetails && (!startingPriceCents || !currencyCode)

  const smartNextAction = (() => {
    if (props.mode === "admin" && !ownerId) {
      return { label: "Select an owner", onClick: () => jumpTo("core") }
    }
    if (missingPricingDetails) {
      return { label: "Set pricing", onClick: () => jumpTo("pricing") }
    }
    if (!hasRevenueSetupDraft) {
      return {
        label: "Connect revenue (+40% ranking)",
        onClick: () => jumpTo("boost", { boostPanel: "revenue" }),
      }
    }
    if (!domainVerified) {
      return {
        label: "Verify domain (badge)",
        onClick: () => jumpTo("boost", { boostPanel: "domain" }),
      }
    }
    if (galleryCount < 3) {
      return { label: "Add screenshots (3+)", onClick: () => jumpTo("media") }
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
      <div>
        <Label>Owner (user)</Label>
        <Select value={ownerId} onValueChange={setOwnerId}>
          <SelectTrigger>
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
      </div>
    ) : null

  const core = (
    <Step1
      categories={props.categories}
      platforms={PLATFORMS as any}
      lockWebsiteUrl={false}
      rightOfWebsite={ownerNode}
      enableAutofill
    />
  )
  const media = <Step2 productId={newProductId} />
  const pricing = <Step3 />
  const verification = <Step4 productId={newProductId} persistOnVerify={false} />
  const details = (
    <Step5
      organizations={props.organizations}
      alternatives={props.mode === "member" ? props.alternatives : []}
    />
  )

  const mediaNode =
    props.mode === "admin" ? (
      <Step2
        productId={newProductId}
        uploadAsClerkId={ownerClerkId}
        requireUploadAsClerkId
      />
    ) : (
      media
    )

  const detailsSubcopy =
    props.mode === "member"
      ? "Social links, organization, and competitor alternatives."
      : "Social links and organization."

  const formId = props.mode === "admin" ? "admin-add-product-form" : "add-product-form"

  const description =
    props.mode === "member"
      ? "Fill the essentials, then optionally add verification and alternatives to boost visibility."
      : "Fill the essentials, then optionally add verification and connect revenue for higher visibility."

  return (
    <>
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">Add product</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form
              id={formId}
              onSubmit={submitWithStatus("published")}
              className="space-y-6 pb-24"
            >
              <Accordion
                type="multiple"
                value={openSections as any}
                onValueChange={(v) => setOpenSections((v as any) ?? [])}
                className="rounded-xl border bg-white/80"
              >
                <AccordionItem id="section-core" value="core" className="px-6">
                  <AccordionTrigger className="-mx-6 gap-2 rounded-lg px-6 text-base hover:no-underline group">
                    <div className="flex w-full items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-900">
                          Core details
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">
                          Website, name, description, category, and platforms.
                        </span>
                      </div>
                      <div className="pt-0.5">
                        <Badge variant="outline">Required</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6">{core}</AccordionContent>
                </AccordionItem>

                <AccordionItem id="section-media" value="media" className="px-6">
                  <AccordionTrigger className="-mx-6 gap-2 rounded-lg px-6 text-base hover:no-underline group">
                    <div className="flex w-full items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-900">
                          Logo & media
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">
                          Logo, optional banner, and screenshots.
                        </span>
                      </div>
                      <div className="pt-0.5">
                        <Badge variant="outline">Required</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6">{mediaNode}</AccordionContent>
                </AccordionItem>

                <AccordionItem id="section-pricing" value="pricing" className="px-6">
                  <AccordionTrigger className="-mx-6 gap-2 rounded-lg px-6 text-base hover:no-underline group">
                    <div className="flex w-full items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-900">Pricing</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          Pricing model and starting price (if applicable).
                        </span>
                      </div>
                      <div className="pt-0.5">
                        <Badge variant="outline">Required</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6">{pricing}</AccordionContent>
                </AccordionItem>

                <AccordionItem id="section-boost" value="boost" className="px-6">
                  <AccordionTrigger className="-mx-6 gap-2 rounded-lg px-6 text-base hover:no-underline group">
                    <div className="flex w-full items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-900">
                          Boost visibility
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">
                          Verified revenue (+40%) and domain badge.
                        </span>
                      </div>
                      <div className="pt-0.5">
                        <Badge>Recommended</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6">
                    <div className="rounded-xl border bg-white/70">
                      <div className="divide-y divide-border/60">
                        <div className="px-4 py-4 sm:px-5">
                          <div
                            role="button"
                            tabIndex={0}
                            aria-expanded={openBoostPanel === "revenue"}
                            className="-mx-2 cursor-pointer rounded-lg px-2 py-2 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-[3px] focus-visible:ring-ring/40"
                            onClick={() => toggleBoostPanel("revenue")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                toggleBoostPanel("revenue")
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900">
                                    Verified revenue
                                  </span>
                                  <Badge variant="outline">Up to +40% ranking</Badge>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className={INFO_TRIGGER_CLASS}
                                        aria-label="Verified revenue help"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                        }}
                                      >
                                        <Info className="h-3.5 w-3.5" aria-hidden="true" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" sideOffset={6}>
                                      Connect a payment provider to become eligible for the
                                      verified revenue ranking boost.
                                    </TooltipContent>
                                  </Tooltip>
                                  {hasRevenueSetupDraft ? (
                                    <Badge variant="success">Connected</Badge>
                                  ) : (
                                    <Badge variant="secondary">Incomplete</Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {openBoostPanel !== "revenue" ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="sm:hidden"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      toggleBoostPanel("revenue")
                                    }}
                                  >
                                    Set up
                                  </Button>
                                ) : null}
                                <ChevronDown
                                  className={[
                                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                                    openBoostPanel === "revenue" ? "rotate-180" : "",
                                  ].join(" ")}
                                  aria-hidden="true"
                                />
                              </div>
                            </div>
                          </div>

                          {openBoostPanel === "revenue" ? (
                            <div className="pt-4">{connectorFields}</div>
                          ) : null}
                        </div>

                        <div className="px-4 py-4 sm:px-5">
                          <div
                            role="button"
                            tabIndex={0}
                            aria-expanded={openBoostPanel === "domain"}
                            className="-mx-2 cursor-pointer rounded-lg px-2 py-2 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-[3px] focus-visible:ring-ring/40"
                            onClick={() => toggleBoostPanel("domain")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                toggleBoostPanel("domain")
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900">
                                    Verified badge
                                  </span>
                                  <Badge variant="outline">Boost trust</Badge>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className={INFO_TRIGGER_CLASS}
                                        aria-label="Verified badge help"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                        }}
                                      >
                                        <Info className="h-3.5 w-3.5" aria-hidden="true" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" sideOffset={6}>
                                      Verify domain ownership to show a verified badge and reduce
                                      impersonation.
                                    </TooltipContent>
                                  </Tooltip>
                                  {domainChecked ? (
                                    domainVerified ? (
                                      <Badge variant="success">Verified</Badge>
                                    ) : (
                                      <Badge variant="destructive">Not found</Badge>
                                    )
                                  ) : (
                                    <Badge variant="secondary">Incomplete</Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {openBoostPanel !== "domain" ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="sm:hidden"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      toggleBoostPanel("domain")
                                    }}
                                  >
                                    Verify
                                  </Button>
                                ) : null}
                                <ChevronDown
                                  className={[
                                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                                    openBoostPanel === "domain" ? "rotate-180" : "",
                                  ].join(" ")}
                                  aria-hidden="true"
                                />
                              </div>
                            </div>
                          </div>

                          {openBoostPanel === "domain" ? (
                            <div className="pt-4">{verification}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem id="section-details" value="details" className="px-6">
                  <AccordionTrigger className="-mx-6 gap-2 rounded-lg px-6 text-base hover:no-underline group">
                    <div className="flex w-full items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-900">
                          Details & positioning
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {detailsSubcopy}
                        </span>
                      </div>
                      <div className="pt-0.5">
                        <Badge variant="secondary">Optional</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6">{details}</AccordionContent>
                </AccordionItem>
              </Accordion>
            </form>
          </FormProvider>
        </CardContent>
        <CardFooter className="sticky bottom-0 z-10 border-t bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {smartNextAction ? (
              <div
                role="button"
                tabIndex={form.formState.isSubmitting ? -1 : 0}
                aria-disabled={form.formState.isSubmitting}
                onClick={() => {
                  if (form.formState.isSubmitting) return
                  smartNextAction.onClick()
                }}
                onKeyDown={(e) => {
                  if (form.formState.isSubmitting) return
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    smartNextAction.onClick()
                  }
                }}
                className="group w-fit select-none text-left text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:rounded focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <span className="text-muted-foreground">Tip:</span>{" "}
                <span className="cursor-pointer underline-offset-4 group-hover:underline">
                  {smartNextAction.label}
                </span>
              </div>
            ) : (
              <span />
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="border-slate-300 text-slate-700"
                disabled={form.formState.isSubmitting}
                onClick={() => submitWithStatus("draft")()}
              >
                Save draft
              </Button>
              <Button type="submit" form={formId} disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

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
            celebrationProductSlug ? productPath(celebrationProductSlug) : undefined
          }
        />
      ) : null}
    </>
  )
}
