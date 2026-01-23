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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import CreateButton from "@/components/molecules/CreateButton"
import PageContainer from "@/components/layout/page-container"
import { createPlanFeatureAction } from "@/actions/admin/plans/features/actions"
import { adminPath } from "@/lib/routes"
import { PLAN_FEATURE_KEYS } from "@/lib/constants"

const featureFormSchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    .refine((v) => PLAN_FEATURE_KEYS.includes(v as any), {
      message: "Select a valid feature key",
    }),
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

    router.push(adminPath("plans", "features"))
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
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a feature key" />
                        </SelectTrigger>
                        <SelectContent>
                          {PLAN_FEATURE_KEYS.map((keyStr) => (
                            <SelectItem key={keyStr} value={keyStr}>
                              {keyStr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                <CreateButton
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  label="Create Feature"
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
