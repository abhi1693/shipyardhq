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
import { Button } from "@/components/atoms/button"
import { Separator } from "@/components/atoms/separator"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/atoms/select"
import PageContainer from "@/components/layout/page-container"
import { createPlanAction } from "@/actions/admin/plans/actions"

const planFormSchema = z
  .object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    type: z.literal("recurring"),
    price: z.coerce.number().nonnegative(),
    interval: z.enum(["month", "year"]),
    frequency: z.coerce.number().min(1),
    discount: z.coerce.number().min(0).optional(),
    trialDays: z.coerce.number().min(0).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(
    (data) => {
      return !(data.discount !== undefined && data.discount >= data.price)
    },
    {
      path: ["discount"],
      message: "Discount must be less than price",
    },
  )

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
      type: "recurring",
      price: 0,
      interval: "month",
      frequency: 1,
      discount: undefined,
      trialDays: undefined,
      isDefault: false,
    },
  })

  async function onSubmit(values: PlanFormInput) {
    const formData = new FormData()
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined) formData.append(key, String(value))
    }

    const result = await createPlanAction(formData)

    if (result?.error) {
      form.setError("name", {
        type: "server",
        message: result.error,
      })
      return
    }

    router.push("/admin/plans")
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
                <FormField
                  name="interval"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interval</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="month">Month</SelectItem>
                          <SelectItem value="year">Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="frequency"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Section: Extras */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="discount"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (in cents)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Optional"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="trialDays"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trial Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Optional"
                          {...field}
                        />
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
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Create Plan
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
