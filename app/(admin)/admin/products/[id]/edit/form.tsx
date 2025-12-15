"use client"

import { useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  useForm,
  FormProvider,
  useWatch,
  type UseFormReturn,
  useFormState,
} from "react-hook-form"
import { toast } from "sonner"
import { ChevronDown, Info } from "lucide-react"

import {
  resetProductConnectorAction,
  updateProductAction,
} from "@/actions/admin/products/actions"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import Step1 from "@/app/(member)/member/products/shared/step1"
import Step2 from "@/app/(member)/member/products/shared/step2"
import Step3 from "@/app/(member)/member/products/shared/step3"
import Step4 from "@/app/(member)/member/products/shared/step4"
import Step5 from "@/app/(member)/member/products/shared/step5"
import {
  makeEditProductSchema,
  type ProductWizardInputEdit,
} from "@/lib/productWizard/schema"
import {
  getInitialValuesFromProduct,
  toUpdatePayload,
} from "@/lib/productWizard/mappers"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Label } from "@/components/atoms/label"
import { adminPath } from "@/lib/routes"
import { PLATFORMS } from "@/lib/productWizard/constants"
import type {
  PaymentConnectorProvider,
  PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client/enums"
import { PaymentConnectorCard } from "@/app/(member)/member/products/shared/PaymentConnectorCard"

type ConnectorSummary = {
  provider?: PaymentConnectorProvider
  status?: PaymentConnectorStatus | null
  lastSyncedAt?: Date | string | null
  lastSyncError?: string | null
  keyHint?: string | null
} | null

function ConnectorFields({
  form,
  connectorState,
  setConnectorState,
  productId,
}: {
  form: UseFormReturn<ProductWizardInput>
  connectorState: ConnectorSummary
  setConnectorState: Dispatch<SetStateAction<ConnectorSummary>>
  productId: string
}) {
  const provider = useWatch({
    control: form.control,
    name: "connectorProvider" as any,
  }) as PaymentConnectorProvider | undefined
  const { errors } = useFormState({ control: form.control })
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

  const lockedProvider = connectorState?.provider

  return (
    <PaymentConnectorCard
      provider={provider ?? connectorState?.provider}
      apiKey={apiKey ?? ""}
      accountId={accountId ?? ""}
      brandId={brandId ?? ""}
      keyHint={connectorState?.keyHint ?? null}
      status={connectorState?.status ?? null}
      lastSyncedAt={connectorState?.lastSyncedAt ?? null}
      lastSyncError={connectorState?.lastSyncError ?? null}
      showSaveButton={false}
      lockedProvider={lockedProvider}
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
      onReset={
        connectorState
          ? async () => {
              const res = await resetProductConnectorAction(productId)
              if ((res as any)?.error) {
                toast.error((res as any).error)
                return
              }
              form.setValue("connectorProvider" as any, undefined as any, {
                shouldDirty: true,
                shouldValidate: true,
              })
              form.setValue("connectorApiKey" as any, "", {
                shouldDirty: true,
                shouldValidate: true,
              })
              form.setValue("connectorAccountId" as any, "", {
                shouldDirty: true,
                shouldValidate: true,
              })
              form.setValue("connectorBrandId" as any, "", {
                shouldDirty: true,
                shouldValidate: true,
              })
              setConnectorState(null)
              toast.success(
                "Removed connector configuration. Enter new details to reconnect.",
              )
            }
          : undefined
      }
    />
  )
}

const schema = makeEditProductSchema()

export type ProductWizardInput = ProductWizardInputEdit

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

export default function EditProductForm({
  product,
  categories,
  organizations,
  users,
  connector,
}: {
  product: any
  categories: { id: string; name: string; icon?: string | null }[]
  organizations: { id: string; name: string }[]
  users: { id: string; email: string }[]
  connector?: {
    id: string
    provider: PaymentConnectorProvider
    status: PaymentConnectorStatus | null
    lastSyncedAt?: Date | string | null
    lastSyncError?: string | null
    keyHint?: string | null
    accountId?: string | null
    brandId?: string | null
  } | null
}) {
  const router = useRouter()
  const [openSections, setOpenSections] = useState<SectionKey[]>([
    "core",
    "media",
    "pricing",
  ])
  const [openBoostPanel, setOpenBoostPanel] = useState<null | "revenue" | "domain">(
    null,
  )
  const [ownerId, setOwnerId] = useState(product.userId as string)
  const [connectorState, setConnectorState] = useState<ConnectorSummary>(
    connector ?? null,
  )

  const form = useForm<ProductWizardInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: getInitialValuesFromProduct(product, connector || undefined),
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

  const productAlreadyVerified = Boolean(product?.verification?.isVerified)
  const domainCheckedEffective = productAlreadyVerified ? true : domainChecked
  const domainVerifiedEffective = productAlreadyVerified ? true : domainVerified

  const hasRevenueSetupDraft = Boolean(
    connectorState?.provider || (connectorProvider && connectorApiKey?.length),
  )

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

  const galleryCount = Array.isArray(product?.ProductMedia)
    ? product.ProductMedia.length
    : 0

  const ownerClerkId =
    typeof product?.user?.clerkId === "string" && product.user.clerkId.length
      ? product.user.clerkId
      : undefined

  const connectorFields = useMemo(() => {
    return (
      <ConnectorFields
        form={form}
        connectorState={connectorState}
        setConnectorState={setConnectorState}
        productId={product.id}
      />
    )
  }, [connectorState, form, product.id])

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
      const payload = toUpdatePayload(values as any, product)
      payload.userId = ownerId
      const res = await updateProductAction(product.id, payload as any)
      if ((res as any)?.error) {
        toast.error((res as any).error)
        return
      }
      toast.success("Product updated successfully")
      router.push(adminPath("products", product.id))
    } catch (e: any) {
      toast.error(e?.message || "Failed to update product")
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
    if (missingPricingDetails) {
      return { label: "Set pricing", onClick: () => jumpTo("pricing") }
    }
    if (!hasRevenueSetupDraft) {
      return {
        label: "Connect revenue (+40% ranking)",
        onClick: () => jumpTo("boost", { boostPanel: "revenue" }),
      }
    }
    if (!domainVerifiedEffective) {
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

  const ownerNode = (
    <div>
      <Label>Owner (user)</Label>
      <Select value={ownerId} onValueChange={setOwnerId}>
        <SelectTrigger>
          <SelectValue placeholder="Select owner" />
        </SelectTrigger>
        <SelectContent>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const core = (
    <Step1
      categories={categories}
      platforms={PLATFORMS as any}
      lockWebsiteUrl={false}
      rightOfWebsite={ownerNode}
      enableAutofill
      autofillNotice="AI Autofill replaces the fields on this step with new suggestions. Your current content will be overwritten."
    />
  )
  const media = (
    <Step2
      productId={product.id}
      productSlug={product.slug}
      galleryMedia={
        product.ProductMedia?.map((m: any) => ({ id: m.id, imageUrl: m.imageUrl })) ??
        []
      }
      canEditGallery
      maxGallery={6}
      uploadAsClerkId={ownerClerkId}
    />
  )
  const pricing = <Step3 />
  const verification = <Step4 productId={product.id} persistOnVerify />
  const details = <Step5 organizations={organizations} alternatives={[]} />

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">
          Edit Product
        </CardTitle>
        <CardDescription>
          Update the essentials, then optionally edit verification and connect revenue
          for higher visibility.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form
            id="admin-edit-product-form"
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
                <AccordionContent className="pt-4 pb-6">{media}</AccordionContent>
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
                        Verified revenue and domain verification.
                      </span>
                    </div>
                    <div className="pt-0.5">
                      <Badge>Recommended</Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <div className="rounded-xl border bg-background/60">
                    <div className="divide-y">
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
                                      <Info
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
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
                                <Badge variant="outline">Trust + filters</Badge>
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
                                      <Info
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" sideOffset={6}>
                                    Verify domain ownership to show a verified badge and reduce
                                    impersonation.
                                  </TooltipContent>
                                </Tooltip>
                                {domainCheckedEffective ? (
                                  domainVerifiedEffective ? (
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
                        Social links and organization.
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
            <Button
              type="submit"
              form="admin-edit-product-form"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
