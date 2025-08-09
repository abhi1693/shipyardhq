"use client"

import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { createUseCaseAction } from "@/actions/admin/categories/actions"
import {
  Card,
  CardContent,
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

const useCaseFormSchema = z.object({
  label: z.string().min(1, "Label is required").max(100, "Label is too long"),
})

type UseCaseFormInput = z.infer<typeof useCaseFormSchema>

export default function AddUseCasePage() {
  const router = useRouter()

  const form = useForm<UseCaseFormInput>({
    resolver: zodResolver(useCaseFormSchema),
    defaultValues: { label: "" },
  })

  async function onSubmit(values: UseCaseFormInput) {
    const formData = new FormData()
    formData.append("label", values.label)

    const result = await createUseCaseAction(formData)
    if (result?.error) {
      form.setError("label", { type: "server", message: result.error })
      return
    }

    router.push("/admin/categories/use-cases")
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Add Use Case
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter use case label" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Create Use Case
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
