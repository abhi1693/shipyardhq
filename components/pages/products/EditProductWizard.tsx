"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { updateProductAction } from "@/actions/admin/products/actions"
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
import ProductWizardAccordion from "@/components/pages/products/_components/ProductWizardAccordion"
import ProductWizardFooter from "@/components/pages/products/_components/ProductWizardFooter"
import { PRODUCT_AUTOFILL_NOTICE } from "@/components/pages/products/_shared/autofillText"
import { useUnsavedChangesWarning } from "@/components/pages/products/_shared/useUnsavedChangesWarning"
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
  editProductSchema,
  makeAdminEditProductSchema,
  type ProductWizardInputEdit,
} from "@/lib/productWizard/schema"
import { adminPath, memberProductPath } from "@/lib/routes"
import type { ProductForEditWizard } from "@/types/product-wizard"
import type {
  ProductWizardAdminEditUserOption,
  ProductWizardAlternativeOption,
  ProductWizardCategoryOption,
} from "@/types/product-wizard"
import { Badge } from "@/components/atoms/badge"

type BaseProps = {
  product: ProductForEditWizard
  categories: ProductWizardCategoryOption[]
}

type MemberProps = BaseProps & {
  mode: "member"
  alternatives: ProductWizardAlternativeOption[]
}

type AdminProps = BaseProps & {
  mode: "admin"
  users: ProductWizardAdminEditUserOption[]
}

export type EditProductWizardProps = MemberProps | AdminProps

export type ProductWizardInput = ProductWizardInputEdit

export default function EditProductWizard(props: EditProductWizardProps) {
  const router = useRouter()
  const schema =
    props.mode === "admin" ? makeAdminEditProductSchema() : editProductSchema
  const {
    openSections,
    setOpenSections,
    openBoostPanel,
    toggleBoostPanel,
    jumpTo,
    openFromErrors,
  } = useWizardNavigation()

  const form = useForm<ProductWizardInput & { ownerId?: string }>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      ...getInitialValuesFromProduct(props.product),
      ...(props.mode === "admin" ? { ownerId: props.product.userId } : {}),
    },
    mode: "onBlur",
  })

  useUnsavedChangesWarning(form.formState.isDirty)

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

  const productAlreadyVerified = Boolean(
    props.product?.verification?.isVerified,
  )
  const domainCheckedEffective = productAlreadyVerified
    ? true
    : Boolean(domainChecked)
  const domainVerifiedEffective = productAlreadyVerified
    ? true
    : Boolean(domainVerified)

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
      const payload = toUpdatePayload(values, props.product)
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
    if (props.mode === "admin" && !ownerId?.length) {
      return { label: "Select an owner", onClick: () => jumpTo("core") }
    }
    if (missingPricingDetails) {
      return { label: "Set pricing", onClick: () => jumpTo("pricing") }
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
      <FormField
        control={form.control}
        name={"ownerId" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center justify-between gap-2">
              <span>Owner (user)</span>
              <Badge variant="secondary">Admin</Badge>
            </FormLabel>
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
    <Step5 alternatives={props.mode === "member" ? props.alternatives : []} />
  )

  const detailsSubcopy =
    props.mode === "member"
      ? "Social links and competitor alternatives."
      : "Social links and positioning details."
  const description =
    props.mode === "member"
      ? "Update the essentials, then optionally edit verification and alternatives to boost visibility."
      : "Update the essentials, then optionally edit verification for higher visibility."
  const formId =
    props.mode === "admin" ? "admin-edit-product-form" : "edit-product-form"

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">
          Edit product
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
              domainChecked={domainCheckedEffective}
              domainVerified={domainVerifiedEffective}
              core={core}
              media={media}
              pricing={pricing}
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
