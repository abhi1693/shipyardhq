"use client"

import { useMemo, useState } from "react"
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
import { MEMBER_PRODUCTS_PATH, memberProductUpgradePath } from "@/lib/routes"

import { createProductAction } from "@/actions/admin/products/actions"
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
import Step1 from "@/app/(member)/member/products/shared/step1"
import Step2 from "@/app/(member)/member/products/shared/step2"
import Step3 from "@/app/(member)/member/products/shared/step3"
import Step4 from "@/app/(member)/member/products/shared/step4"
import {
  makeAddProductSchema,
  type ProductWizardInputAdd,
} from "@/lib/productWizard/schema"
import {
  getInitialValuesForAdd,
  toCreateFormData,
} from "@/lib/productWizard/mappers"
import { PLATFORMS } from "@/lib/productWizard/constants"
import type { PaymentConnectorProvider as PaymentConnectorProviderType } from "@/lib/vendor/prisma/client/enums"
import { PaymentConnectorCard } from "../shared/PaymentConnectorCard"

function ConnectorFields({
  form,
}: {
  form: UseFormReturn<ProductWizardInput>
}) {
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

type SectionKey = "core" | "pricing" | "boost" | "details"

const SECTION_FIELDS: Record<SectionKey, readonly string[]> = {
  core: [
    "websiteUrl",
    "name",
    "tagline",
    "description",
    "logo",
    "categoryId",
    "type",
    "platforms",
    "keywordsText",
  ],
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
    "bannerImage",
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

export default function AddProductForm({
  categories,
  organizations,
  userId,
  alternatives,
}: {
  categories: { id: string; name: string }[]
  organizations: { id: string; name: string }[]
  userId: string
  alternatives: {
    id: string
    slug?: string | null
    name: string
    websiteUrl?: string | null
  }[]
}) {
  const router = useRouter()
  const [openSections, setOpenSections] = useState<SectionKey[]>([
    "core",
    "pricing",
  ])
  const [newProductId] = useState(() => {
    const g: any = typeof globalThis !== "undefined" ? (globalThis as any) : {}
    const c = g.crypto as Crypto | undefined
    if (c && typeof (c as any).randomUUID === "function") {
      return (c as any).randomUUID()
    }
    // Fallback: pseudo-uuid
    const rand = () => Math.random().toString(36).slice(2, 10)
    return `prod_${Date.now().toString(36)}_${rand()}_${rand()}`
  })
  const form = useForm<ProductWizardInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: getInitialValuesForAdd(),
    mode: "onBlur",
  })

  const connectorFields = useMemo(() => {
    return <ConnectorFields form={form} />
  }, [form])

  async function submitAll(
    values: ProductWizardInput & { status?: "draft" | "published" },
  ) {
    try {
      const fd = toCreateFormData(values, userId, newProductId)
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
    setOpenSections((prev) => {
      const next = new Set<SectionKey>(prev)
      sectionsToOpen.forEach((s) => next.add(s))
      return Array.from(next)
    })
  }

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

  const core = (
    <Step1
      categories={categories}
      platforms={PLATFORMS as any}
      productId={newProductId}
      enableAutofill
    />
  )
  const pricing = <Step2 />
  const verification = (
    <Step3 productId={newProductId} persistOnVerify={false} />
  )
  const details = (
    <Step4
      organizations={organizations}
      productId={newProductId}
      alternatives={alternatives}
    />
  )

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">Add product</CardTitle>
        <CardDescription>
          Fill the essentials, then optionally add verification and alternatives
          to boost visibility.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form
            id="add-product-form"
            onSubmit={submitWithStatus("published")}
            className="space-y-6 pb-24"
          >
            <Accordion
              type="multiple"
              value={openSections}
              onValueChange={(v) => setOpenSections(v as SectionKey[])}
              className="rounded-xl border bg-white/80"
            >
              <AccordionItem value="core" className="px-6">
                <AccordionTrigger className="-mx-6 rounded-lg px-6 text-base hover:no-underline">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        Core details
                      </span>
                      <Badge variant="outline">Required</Badge>
                    </div>
                    <span className="text-xs font-normal text-muted-foreground">
                      Website, name, description, logo, category, and platforms.
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">{core}</AccordionContent>
              </AccordionItem>

              <AccordionItem value="pricing" className="px-6">
                <AccordionTrigger className="-mx-6 rounded-lg px-6 text-base hover:no-underline">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        Pricing
                      </span>
                      <Badge variant="outline">Required</Badge>
                    </div>
                    <span className="text-xs font-normal text-muted-foreground">
                      Tell visitors how you monetize (or that it&apos;s free).
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">{pricing}</AccordionContent>
              </AccordionItem>

              <AccordionItem value="boost" className="px-6">
                <AccordionTrigger className="-mx-6 rounded-lg px-6 text-base hover:no-underline">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        Boost visibility
                      </span>
                      <Badge>Recommended</Badge>
                    </div>
                    <span className="text-xs font-normal text-muted-foreground">
                      Verify revenue + domain ownership to rank higher and build
                      trust.
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 sm:p-5">
                      {connectorFields}
                    </div>
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 sm:p-5">
                      {verification}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="details" className="px-6">
                <AccordionTrigger className="-mx-6 rounded-lg px-6 text-base hover:no-underline">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        Details & positioning
                      </span>
                      <Badge variant="secondary">Optional</Badge>
                    </div>
                    <span className="text-xs font-normal text-muted-foreground">
                      Social links, banner, organization, and competitor
                      alternatives.
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">{details}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </form>
        </FormProvider>
      </CardContent>
      <CardFooter className="sticky bottom-0 z-10 border-t bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Recommended: add verified revenue and alternatives now so you rank
            higher from day one.
          </p>
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
              form="add-product-form"
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

export type { ProductWizardInput as AddProductValues }
