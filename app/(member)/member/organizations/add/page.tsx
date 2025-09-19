"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { createMyOrganizationAction } from "@/actions/member/organizations/actions"
import PageContainer from "@/components/layout/page-container"
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
import { ensureUrlHasSchema } from "@/lib/utils"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z
    .string()
    .min(1, "URL is required")
    .refine((value) => {
      try {
        new URL(ensureUrlHasSchema(value))
        return true
      } catch {
        return false
      }
    }, "Enter a valid URL, e.g. https://acme.com"),
})

type Values = z.infer<typeof schema>

export default function AddOrganizationPage() {
  const router = useRouter()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", url: "" },
  })

  async function onSubmit(values: Values) {
    const fd = new FormData()
    fd.append("name", values.name)
    fd.append("url", ensureUrlHasSchema(values.url))
    const res = await createMyOrganizationAction(fd)
    if ((res as any)?.error) {
      form.setError("url", { type: "server", message: (res as any).error })
      return
    }
    router.push("/member/organizations")
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            New Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://acme.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CreateButton
                type="submit"
                disabled={form.formState.isSubmitting}
                label="Create"
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
