"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import { Button } from "@/components/atoms/button"
import PageContainer from "@/components/layout/page-container"
import { createPlanFeatureAction } from "@/actions/admin/plans/features/actions"

const featureFormSchema = z.object({
  key: z.string().min(1, "Key is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
})

type FeatureFormInput = z.infer<typeof featureFormSchema>

export default function AddPlanFeatureForm() {
  const router = useRouter()

  const form = useForm<FeatureFormInput>({
    resolver: zodResolver(featureFormSchema),
    defaultValues: {
      key: "",
      name: "",
      description: "",
    },
  })

  async function onSubmit(values: FeatureFormInput) {
    const formData = new FormData()
    for (const [key, value] of Object.entries(values)) {
      formData.append(key, value)
    }

    const result = await createPlanFeatureAction(formData)

    if (result?.error) {
      form.setError("key", {
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
            Add Feature
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Define a reusable feature. Assign it to plans separately.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                name="key"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                      <Input placeholder="feature.unique.key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Feature Name" {...field} />
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
                      <Input placeholder="What this feature does" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Create Feature
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
