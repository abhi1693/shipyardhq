"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { createProductAction } from "@/actions/admin/products/actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
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
import ProductConnectorFields from "@/components/pages/products/_components/ProductConnectorFields"
import ProductWizardAccordion from "@/components/pages/products/_components/ProductWizardAccordion"
import ProductWizardFooter from "@/components/pages/products/_components/ProductWizardFooter"
import { PRODUCT_AUTOFILL_NOTICE } from "@/components/pages/products/_shared/autofillText"
import { useWizardNavigation } from "@/components/pages/products/_shared/wizardNavigation"
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
  ProductWizardOrganizationOption,
} from "@/types/product-wizard"
import type { ProductWizardInputAdd } from "@/lib/productWizard/schema"

type BaseProps = {
  categories: ProductWizardCategoryOption[]
  organizations: ProductWizardOrganizationOption[]
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

  const ownerId = useWatch({
    control: form.control,
    name: "ownerId" as any,
  }) as string | undefined

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

  const hasRevenueSetupDraft = Boolean(
    connectorProvider && connectorApiKey?.length,
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
  const galleryUrls = useWatch({
    control: form.control,
    name: "galleryMedia" as any,
  }) as string[] | undefined
  const galleryCount = Array.isArray(galleryUrls) ? galleryUrls.length : 0

  const ownerClerkId =
    props.mode === "admin"
      ? ownerId?.length
        ? props.users.find((u) => u.id === ownerId)?.clerkId
        : undefined
      : undefined

  const connectorFields = useMemo(() => {
    return <ProductConnectorFields form={form} />
  }, [form])

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

  const needsPricingDetails =
    pricingModel === "subscription" || pricingModel === "one_time"
  const missingPricingDetails =
    needsPricingDetails && (!startingPriceCents || !currencyCode)

  const smartNextAction = (() => {
    if (props.mode === "admin" && !ownerId?.length) {
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
      <FormField
        control={form.control}
        name={"ownerId" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Owner (user)</FormLabel>
            <Select value={field.value || ""} onValueChange={field.onChange}>
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
    <Step5
      organizations={props.organizations}
      alternatives={props.mode === "member" ? props.alternatives : []}
    />
  )

  const detailsSubcopy =
    props.mode === "member"
      ? "Social links, organization, and competitor alternatives."
      : "Social links and organization."
  const description =
    props.mode === "member"
      ? "Fill the essentials, then optionally add verification and alternatives to boost visibility."
      : "Fill the essentials, then optionally add verification and connect revenue for higher visibility."
  const formId =
    props.mode === "admin" ? "admin-add-product-form" : "add-product-form"

  return (
    <>
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Add product
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form
              id={formId}
              onSubmit={submitWithStatus("published")}
              className="space-y-6 pb-24"
            >
              <ProductWizardAccordion
                openSections={openSections}
                onOpenSectionsChange={setOpenSections}
                openBoostPanel={openBoostPanel}
                onToggleBoostPanel={toggleBoostPanel}
                hasRevenueSetupDraft={hasRevenueSetupDraft}
                domainChecked={Boolean(domainChecked)}
                domainVerified={Boolean(domainVerified)}
                core={core}
                media={media}
                pricing={pricing}
                connectorFields={connectorFields}
                verification={verification}
                details={details}
                detailsSubcopy={detailsSubcopy}
              />
            </form>
          </FormProvider>
        </CardContent>
        <CardFooter className="sticky bottom-0 z-10 border-t bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <ProductWizardFooter
            formId={formId}
            isSubmitting={form.formState.isSubmitting}
            smartNextAction={smartNextAction}
            onSaveDraft={() => submitWithStatus("draft")()}
          />
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
            celebrationProductSlug
              ? productPath(celebrationProductSlug)
              : undefined
          }
        />
      ) : null}
    </>
  )
}
