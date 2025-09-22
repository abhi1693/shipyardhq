"use client"

import { useRouter } from "next/navigation"
import { useForm, UseFormProps } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import { Checkbox } from "@/components/atoms/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import CreateButton from "@/components/molecules/CreateButton"
import { Separator } from "@/components/atoms/separator"

import PageContainer from "@/components/layout/page-container"
import { createPlanAction } from "@/actions/admin/plans/actions"
import { adminPath } from "@/lib/routes"

const planFormSchema = z
  .object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    type: z
      .enum(["one_time_price", "recurring_price"])
      .default("one_time_price"),
    price: z.coerce.number().nonnegative(),
    discount: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce.number().min(0).max(100).optional(),
    ),
    boostForDays: z.coerce.number().min(1).max(30),
    isDefault: z.boolean().optional(),
    paymentFrequencyCount: z.coerce.number().int().positive().optional(),
    paymentFrequencyInterval: z
      .enum(["day", "week", "month", "year"])
      .optional(),
    subscriptionPeriodCount: z.coerce.number().int().positive().optional(),
    subscriptionPeriodInterval: z
      .enum(["day", "week", "month", "year"])
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "recurring_price") {
      if (val.paymentFrequencyCount == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Payment frequency count is required for recurring plans",
          path: ["paymentFrequencyCount"],
        })
      }
      if (val.subscriptionPeriodCount == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Subscription period count is required for recurring plans",
          path: ["subscriptionPeriodCount"],
        })
      }
    }
  })

type PlanFormInput = z.infer<typeof planFormSchema>

export default function AddPlanForm() {
  const router = useRouter()

  const form = useForm<PlanFormInput>({
    resolver: zodResolver(
      planFormSchema,
    ) as UseFormProps<PlanFormInput>["resolver"],
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      type: "one_time_price",
      price: 0,
      discount: undefined,
      boostForDays: 1,
      isDefault: false,
      paymentFrequencyCount: undefined,
      paymentFrequencyInterval: undefined,
      subscriptionPeriodCount: undefined,
      subscriptionPeriodInterval: undefined,
    },
  })

  async function onSubmit(values: PlanFormInput) {
    const formData = new FormData()
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined) formData.append(key, String(value))
    }
    const result = await createPlanAction(formData)
    if (result?.error) {
      form.setError("name", { type: "server", message: result.error })
      return
    }
    router.push(adminPath("plans"))
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Add Plan
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Fill in the required details for the plan.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Section: Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Pro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="slug"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="pro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                name="description"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Section: Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  name="type"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => field.onChange(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one_time_price">
                            One-time
                          </SelectItem>
                          <SelectItem value="recurring_price">
                            Recurring
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="price"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (in cents)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Recurring Details */}
              {form.watch("type") === "recurring_price" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    name="paymentFrequencyCount"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Frequency Count</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="paymentFrequencyInterval"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Frequency Interval</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => field.onChange(v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Day</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="year">Year</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="subscriptionPeriodCount"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscription Period Count</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="subscriptionPeriodInterval"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscription Period Interval</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => field.onChange(v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Day</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="year">Year</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Separator />

              {/* Section: Extras */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="discount"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="boostForDays"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Boost For (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={30} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                name="isDefault"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Set as default plan</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <CreateButton
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  label="Create Plan"
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
