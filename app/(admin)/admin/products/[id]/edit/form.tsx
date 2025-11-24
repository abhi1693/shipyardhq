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

import {
  resetProductConnectorAction,
  updateProductAction,
} from "@/actions/admin/products/actions"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Separator } from "@/components/atoms/separator"

import WizardStepper from "@/components/molecules/WizardStepper"
import WizardFooter from "@/components/molecules/WizardFooter"
import { STEPS, STEP_FIELDS } from "@/lib/productWizard/constants"
import { validateExternalResources as validateResources } from "@/lib/productWizard/validate"
import {
  makeEditProductSchema,
  type ProductWizardInputEdit,
} from "@/lib/productWizard/schema"
import {
  getInitialValuesFromProduct,
  toUpdatePayload,
} from "@/lib/productWizard/mappers"
import { useProductWizard } from "@/hooks/useProductWizard"
import { renderStep } from "@/components/molecules/ProductWizardStepRenderer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Label } from "@/components/atoms/label"
import { adminPath } from "@/lib/routes"
import {
  PaymentConnectorProvider,
  PaymentConnectorProvider as PaymentConnectorProviderEnum,
  PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client/enums"
import { PaymentConnectorCard } from "@/app/(member)/member/products/shared/PaymentConnectorCard"

function ConnectorFields({
  form,
  connector,
  productId,
}: {
  form: UseFormReturn<ProductWizardInput>
  connector: {
    provider?: PaymentConnectorProvider
    status?: PaymentConnectorStatus | null
    lastSyncedAt?: Date | string | null
    lastSyncError?: string | null
    keyHint?: string | null
    accountId?: string | null
    brandId?: string | null
  } | null
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

  const [connectorState, setConnectorState] = useState(connector)

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

export default function EditProductForm({
  product,
  categories,
  organizations,
  users,
  connector,
}: {
  product: any
  categories: { id: string; name: string }[]
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
  const [ownerId, setOwnerId] = useState(product.userId as string)

  const form = useForm<ProductWizardInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: getInitialValuesFromProduct(product, connector || undefined),
    mode: "onBlur",
  })

  const wizard = useProductWizard<ProductWizardInput>({
    form,
    steps: STEPS,
    stepFields: STEP_FIELDS,
    validateExternal: async () => {
      const v = form.getValues() as any
      const { issues, checks } = await validateResources(v)
      form.setValue("reviewIssues" as any, issues)
      form.setValue("reviewChecks" as any, checks)
      if (issues.length) {
        toast.error("Some links/images look invalid. Please review.")
        return false
      }
      return true
    },
    onSubmit: async (values) => {
      const payload = toUpdatePayload(values as any, product)
      payload.userId = ownerId
      const res = await updateProductAction(product.id, payload as any)
      if ((res as any)?.error) {
        toast.error((res as any).error)
        return
      }
      toast.success("Product updated successfully")
      router.push(adminPath("products", product.id))
    },
  })

  const StepComponent = useMemo(() => {
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
    return renderStep(wizard.step, {
      categories,
      organizations,
      productId: product.id,
      lockWebsiteUrl: false,
      persistOnVerify: true,
      canEditCTA: true,
      rightOfWebsite: ownerNode,
      pricingAside: (
        <ConnectorFields
          form={form}
          connector={connector ?? null}
          productId={product.id}
        />
      ),
    })
  }, [
    wizard.step,
    categories,
    organizations,
    product.id,
    ownerId,
    users,
    connector,
    form,
  ])

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">
          Edit Product
        </CardTitle>
      </CardHeader>
      <CardContent>
        <WizardStepper steps={STEPS} step={wizard.step} />

        {/* Admin-only owner control is inlined on Step 1 via rightOfWebsite */}

        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(() =>
              wizard.submitWithStatus("published"),
            )}
            className="space-y-6"
          >
            {StepComponent}

            <Separator className="my-4" />

            <WizardFooter
              isReview={wizard.isReview}
              onBack={wizard.back}
              onNext={wizard.next}
              onSaveDraft={() => wizard.submitWithStatus("draft")}
              onPublish={() => wizard.submitWithStatus("published")}
              disableBack={wizard.step === 1}
              isSubmitting={form.formState.isSubmitting}
            />
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  )
}
