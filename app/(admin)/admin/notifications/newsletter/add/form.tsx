"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { createNewsletterSubscriberAction } from "@/actions/admin/newsletter/actions"
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
import CreateButton from "@/components/molecules/CreateButton"
import PageContainer from "@/components/layout/page-container"
import { adminPath } from "@/lib/routes"

const formSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
})

type FormValues = z.infer<typeof formSchema>

export default function AddNewsletterSubscriberForm() {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: FormValues) {
    const formData = new FormData()
    formData.append("email", values.email)

    const result = await createNewsletterSubscriberAction(formData)

    if (result?.error) {
      form.setError("email", {
        type: "server",
        message: result.error,
      })
      return
    }

    router.push(adminPath("notifications", "newsletter"))
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Add Newsletter Subscriber
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="crew@shipyardhq.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CreateButton
                type="submit"
                label="Add Subscriber"
                disabled={form.formState.isSubmitting}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
