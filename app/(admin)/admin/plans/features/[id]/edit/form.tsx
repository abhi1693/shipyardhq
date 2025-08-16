"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
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
import SaveButton from "@/components/molecules/SaveButton"
import PageContainer from "@/components/layout/page-container"
import { updatePlanFeatureAction } from "@/actions/admin/plans/features/actions"

const featureFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
})

type FeatureFormInput = z.infer<typeof featureFormSchema>

export default function EditPlanFeatureForm({
  id,
  name,
  description,
}: {
  id: string
  name: string
  description: string
}) {
  const router = useRouter()

  const form = useForm<FeatureFormInput>({
    resolver: zodResolver(featureFormSchema),
    defaultValues: {
      name,
      description,
    },
  })

  async function onSubmit(values: FeatureFormInput) {
    const result = await updatePlanFeatureAction(id, values)

    if (result?.error) {
      form.setError("root", {
        type: "server",
        message: result.error,
      })
      return
    }

    router.push("/admin/plans/features")
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Edit Feature
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Update the feature name and description.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Feature name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="description"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Feature description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.root.message}
                </p>
              )}

              <div className="pt-2">
              <SaveButton type="submit" disabled={form.formState.isSubmitting}>
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
