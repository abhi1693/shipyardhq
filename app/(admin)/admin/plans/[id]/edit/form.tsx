"use client"

import { useRouter } from "next/navigation"
import { useForm, UseFormProps } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import { Checkbox } from "@/components/atoms/checkbox"
import SaveButton from "@/components/molecules/SaveButton"
import { Separator } from "@/components/atoms/separator"

import PageContainer from "@/components/layout/page-container"
import { updatePlanAction } from "@/actions/admin/plans/actions"
import { Plan } from "@/lib/vendor/prisma/client"

const planFormSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  discount: z.coerce.number().min(0).max(100).optional(),
  boostForDays: z.coerce.number().min(1).max(30),
  isDefault: z.boolean().optional(),
})

type PlanFormInput = z.infer<typeof planFormSchema>

export default function EditPlanForm({ plan }: { plan: Plan }) {
  const router = useRouter()

  const form = useForm<PlanFormInput>({
    resolver: zodResolver(
      planFormSchema,
    ) as UseFormProps<PlanFormInput>["resolver"],
    defaultValues: {
      name: plan.name,
      slug: plan.slug,
      description: plan.description ?? "",
      price: plan.price,
      discount: plan.discount ?? undefined,
      boostForDays: (plan as any).boostForDays ?? 1,
      isDefault: plan.isDefault ?? false,
    },
  })

  async function onSubmit(values: PlanFormInput) {
    const result = await updatePlanAction(plan.id, values)

    if (result?.error) {
      form.setError("name", {
        type: "server",
        message: result.error,
      })
      return
    }

    router.push(`/admin/plans/${plan.id}`)
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Edit Plan
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Modify details for this subscription plan.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              </div>

              <Separator />

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
                        <Input type="number" min={1} max={30} {...field} />
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
                <SaveButton
                  type="submit"
                  disabled={form.formState.isSubmitting}
                >
                  Save Changes
                </SaveButton>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
