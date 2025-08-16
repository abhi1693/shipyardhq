"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { updateOrganizationAction } from "@/actions/admin/organizations/actions"
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
import SaveButton from "@/components/molecules/SaveButton"
import PageContainer from "@/components/layout/page-container"
import type { Organization } from "@prisma/client"

const orgSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Valid URL required"),
})

type OrgFormInput = z.infer<typeof orgSchema>

export default function EditOrganizationForm({
  organization,
}: {
  organization: Organization
}) {
  const router = useRouter()

  const form = useForm<OrgFormInput>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: organization.name, url: organization.url },
  })

  async function onSubmit(values: OrgFormInput) {
    const result = await updateOrganizationAction(organization.id, values)
    if ((result as any)?.error) {
      form.setError("name", { type: "server", message: (result as any).error })
      return
    }
    router.push(`/admin/organizations/${organization.id}`)
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Edit Organization
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
                      <Input placeholder="Organization name" {...field} />
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
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
