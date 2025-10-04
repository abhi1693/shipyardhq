"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import SaveButton from "@/components/molecules/SaveButton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Switch } from "@/components/atoms/switch"
import PageContainer from "@/components/layout/page-container"
import {
  createRewardCatalogItemAction,
  updateRewardCatalogItemAction,
} from "@/actions/admin/rewards/actions"
import { adminPath } from "@/lib/routes"
import {
  RewardCatalogItem,
  RewardFeatureCategory,
} from "@/lib/vendor/prisma/client"

type PlanFeatureOption = {
  key: string
  name: string
}

const optionalWholeNumber = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (value == null || value === "") return true
    return /^\d+$/.test(value)
  }, "Enter a whole number")

const requiredPositiveNumber = z
  .string()
  .trim()
  .min(1, "Enter base cost")
  .refine((value) => /^\d+$/.test(value) && Number(value) > 0, {
    message: "Enter a value greater than zero",
  })

const positiveOptionalNumber = optionalWholeNumber.refine((value) => {
  if (value == null || value === "") return true
  const parsed = Number(value)
  return parsed > 0
}, "Enter a value greater than zero")

const jsonString = z
  .string()
  .optional()
  .refine((value) => {
    if (!value) return true
    try {
      JSON.parse(value)
      return true
    } catch {
      return false
    }
  }, "Must be valid JSON")

const catalogFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  featureKey: z.string().min(1, "Feature key is required"),
  planFeatureKey: z.string().optional(),
  description: z.string().optional(),
  category: z.nativeEnum(RewardFeatureCategory, {
    message: "Select a category",
  }),
  baseCost: requiredPositiveNumber,
  durationSeconds: positiveOptionalNumber,
  maxActivePerUser: positiveOptionalNumber,
  maxPendingPerUser: positiveOptionalNumber,
  requiresProduct: z.boolean().default(true),
  isActive: z.boolean().default(true),
  metadata: jsonString,
})

type CatalogFormValues = z.input<typeof catalogFormSchema>

type CatalogFormProps = {
  mode: "create" | "edit"
  item?: RewardCatalogItem
  planFeatureOptions: PlanFeatureOption[]
}

const categoryOptions = Object.values(RewardFeatureCategory)
const NO_PLAN_FEATURE_VALUE = "__none__"

export default function CatalogForm({
  mode,
  item,
  planFeatureOptions,
}: CatalogFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<CatalogFormValues>({
    resolver: zodResolver(catalogFormSchema),
    defaultValues: {
      name: item?.name ?? "",
      featureKey: item?.featureKey ?? "",
      planFeatureKey: item?.planFeatureKey ?? undefined,
      description: item?.description ?? "",
      category: item?.category ?? RewardFeatureCategory.placement,
      baseCost: item ? String(item.baseCost) : "100",
      durationSeconds:
        item?.durationSeconds != null
          ? String(item.durationSeconds)
          : undefined,
      maxActivePerUser:
        item?.maxActivePerUser != null
          ? String(item.maxActivePerUser)
          : undefined,
      maxPendingPerUser:
        item?.maxPendingPerUser != null
          ? String(item.maxPendingPerUser)
          : undefined,
      requiresProduct: item?.requiresProduct ?? true,
      isActive: item?.isActive ?? true,
      metadata: item?.metadata ? JSON.stringify(item.metadata, null, 2) : "",
    },
  })

  async function onSubmit(values: CatalogFormValues) {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("name", values.name)
        formData.set("featureKey", values.featureKey)
        formData.set("category", values.category)
        formData.set("baseCost", String(values.baseCost))
        formData.set("isActive", values.isActive ? "true" : "false")
        formData.set(
          "requiresProduct",
          values.requiresProduct ? "true" : "false",
        )
        if (values.planFeatureKey) {
          formData.set("planFeatureKey", values.planFeatureKey)
        }
        if (values.description) {
          formData.set("description", values.description)
        }
        if (values.durationSeconds) {
          formData.set("durationSeconds", values.durationSeconds)
        }
        if (values.maxActivePerUser) {
          formData.set("maxActivePerUser", values.maxActivePerUser)
        }
        if (values.maxPendingPerUser) {
          formData.set("maxPendingPerUser", values.maxPendingPerUser)
        }
        if (values.metadata) {
          formData.set("metadata", values.metadata)
        }

        const result =
          mode === "create"
            ? await createRewardCatalogItemAction(formData)
            : await updateRewardCatalogItemAction(item!.id, formData)

        if (result?.error) {
          toast.error(result.error)
          return
        }

        toast.success(
          mode === "create" ? "Catalog item created" : "Catalog item updated",
        )
        router.push(adminPath("rewards", "catalog"))
      } catch (error) {
        console.error(error)
        toast.error("We hit an error saving the catalog item")
      }
    })
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            {mode === "create" ? "Create catalog item" : "Edit catalog item"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Priority placement" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="featureKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feature key</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="priorityPlacement"
                          {...field}
                          disabled={mode === "edit"}
                        />
                      </FormControl>
                      <FormDescription>
                        Immutable identifier consumed by the rewards engine.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="planFeatureKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan feature</FormLabel>
                      <Select
                        value={field.value ?? NO_PLAN_FEATURE_VALUE}
                        onValueChange={(value) =>
                          field.onChange(
                            value === NO_PLAN_FEATURE_VALUE ? undefined : value,
                          )
                        }
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan feature" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_PLAN_FEATURE_VALUE}>
                            No plan feature
                          </SelectItem>
                          {planFeatureOptions.map((feature) => (
                            <SelectItem key={feature.key} value={feature.key}>
                              {feature.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Optional linkage to an existing plan feature key.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the perk members unlock"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="baseCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base cost</FormLabel>
                      <FormControl>
                        <Input placeholder="150" {...field} />
                      </FormControl>
                      <FormDescription>
                        Rewards required to redeem.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="durationSeconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (seconds)</FormLabel>
                      <FormControl>
                        <Input placeholder="86400" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave blank for one-time entitlements.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxActivePerUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max active per user</FormLabel>
                      <FormControl>
                        <Input placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxPendingPerUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max pending per user</FormLabel>
                      <FormControl>
                        <Input placeholder="2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="requiresProduct"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel>Requires product</FormLabel>
                        <FormDescription>
                          Member must pick a product during redemption.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Disabled items disappear from redemption lists.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="metadata"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metadata</FormLabel>
                    <FormControl>
                      <Textarea placeholder="{}" rows={4} {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional JSON payload stored on the item.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <SaveButton type="submit" loading={isPending}>
                  {mode === "create" ? "Create catalog item" : "Save changes"}
                </SaveButton>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
