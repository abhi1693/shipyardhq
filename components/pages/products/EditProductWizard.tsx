"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  FormProvider,
  useForm,
  useWatch,
} from "react-hook-form"
import { toast } from "sonner"

import {
  resetProductConnectorAction,
  updateProductAction,
} from "@/actions/admin/products/actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Label } from "@/components/atoms/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
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
  getInitialValuesFromProduct,
  toUpdatePayload,
} from "@/lib/productWizard/mappers"
import {
  makeEditProductSchema,
  type ProductWizardInputEdit,
} from "@/lib/productWizard/schema"
import { adminPath, memberProductPath } from "@/lib/routes"
import type {
  PaymentConnectorProvider,
  PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client/enums"

type ConnectorSummary = {
  provider?: PaymentConnectorProvider
  status?: PaymentConnectorStatus | null
  lastSyncedAt?: Date | string | null
  lastSyncError?: string | null
  keyHint?: string | null
} | null

type AlternativeProduct = {
  id: string
  slug?: string | null
  name: string
  websiteUrl?: string | null
}

type BaseProps = {
  product: any
  categories: { id: string; name: string; icon?: string | null }[]
  organizations: { id: string; name: string }[]
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
}

type MemberProps = BaseProps & {
  mode: "member"
  alternatives: AlternativeProduct[]
}

type AdminProps = BaseProps & {
  mode: "admin"
  users: { id: string; email: string }[]
}

export type EditProductWizardProps = MemberProps | AdminProps

const schema = makeEditProductSchema()
export type ProductWizardInput = ProductWizardInputEdit

export default function EditProductWizard(props: EditProductWizardProps) {
  const router = useRouter()
  const {
    openSections,
    setOpenSections,
    openBoostPanel,
    toggleBoostPanel,
    jumpTo,
    openFromErrors,
  } = useWizardNavigation()

  const [ownerId, setOwnerId] = useState(
    props.mode === "admin" ? ((props.product?.userId as string) ?? "") : "",
  )
  const [connectorState, setConnectorState] = useState<ConnectorSummary>(
    props.connector ?? null,
  )

  const form = useForm<ProductWizardInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: getInitialValuesFromProduct(
      props.product,
      props.connector || undefined,
    ),
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

  const productAlreadyVerified = Boolean(props.product?.verification?.isVerified)
  const domainCheckedEffective = productAlreadyVerified ? true : Boolean(domainChecked)
  const domainVerifiedEffective = productAlreadyVerified ? true : Boolean(domainVerified)

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

  const galleryCount = Array.isArray(props.product?.ProductMedia)
    ? props.product.ProductMedia.length
    : 0

  const ownerClerkId =
    props.mode === "admin" &&
    typeof props.product?.user?.clerkId === "string" &&
    props.product.user.clerkId.length
      ? props.product.user.clerkId
      : undefined

  const connectorFields = useMemo(() => {
    return (
      <ProductConnectorFields
        form={form}
        providerFallback={connectorState?.provider}
        lockedProvider={connectorState?.provider}
        keyHint={connectorState?.keyHint ?? null}
        status={connectorState?.status ?? null}
        lastSyncedAt={connectorState?.lastSyncedAt ?? null}
        lastSyncError={connectorState?.lastSyncError ?? null}
        onReset={
          connectorState
            ? async () => {
                const res = await resetProductConnectorAction(props.product.id)
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
  }, [connectorState, form, props.product.id, setConnectorState])

  async function submitAll(
    values: ProductWizardInput & { status?: "draft" | "published" },
  ) {
    try {
      if (props.mode === "admin" && !ownerId) {
        toast.error("Please select an owner")
        jumpTo("core")
        return
      }
      const payload = toUpdatePayload(values as any, props.product) as any
      if (props.mode === "admin") payload.userId = ownerId
      const res = await updateProductAction(props.product.id, payload)
      if ((res as any)?.error) {
        toast.error((res as any).error)
        return
      }
      toast.success("Product updated successfully")
      if (props.mode === "admin") {
        router.push(adminPath("products", props.product.id))
      } else {
        router.push(memberProductPath(props.product.slug))
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update product")
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
      lockWebsiteUrl={props.mode === "member"}
      rightOfWebsite={ownerNode}
      enableAutofill
      autofillNotice={PRODUCT_AUTOFILL_NOTICE}
    />
  )
  const media = (
    <Step2
      productId={props.product.id}
      productSlug={props.product.slug}
      galleryMedia={
        props.product.ProductMedia?.map((m: any) => ({
          id: m.id,
          imageUrl: m.imageUrl,
        })) ?? []
      }
      canEditGallery
      maxGallery={6}
      uploadAsClerkId={ownerClerkId}
    />
  )
  const pricing = <Step3 />
  const verification = <Step4 productId={props.product.id} persistOnVerify />
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
      ? "Update the essentials, then optionally edit verification and alternatives to boost visibility."
      : "Update the essentials, then optionally edit verification and connect revenue for higher visibility."
  const formId =
    props.mode === "admin" ? "admin-edit-product-form" : "edit-product-form"

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">Edit product</CardTitle>
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
              domainChecked={domainCheckedEffective}
              domainVerified={domainVerifiedEffective}
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
  )
}
