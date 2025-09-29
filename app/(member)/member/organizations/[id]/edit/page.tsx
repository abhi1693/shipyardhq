"use client"

import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  updateMyOrganizationAction,
  getMyOrganizationById,
} from "@/actions/member/organizations/actions"
import { MEMBER_ORGANIZATIONS_PATH, memberOrganizationPath } from "@/lib/routes"
import { useEffect, useState } from "react"
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

export default function EditOrganizationPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const organizationId = params?.id
  const [initial, setInitial] = useState<Values | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", url: "" },
  })

  useEffect(() => {
    ;(async () => {
      if (!organizationId) return
      const org = (await getMyOrganizationById(organizationId)) as {
        name: string
        url: string
      } | null
      if (!org) return router.replace(MEMBER_ORGANIZATIONS_PATH)
      const normalizedUrl = ensureUrlHasSchema(org.url)
      setInitial({ name: org.name, url: normalizedUrl })
      form.reset({ name: org.name, url: normalizedUrl })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  async function onSubmit(values: Values) {
    if (!organizationId) return
    const res = await updateMyOrganizationAction(organizationId, {
      ...values,
      url: ensureUrlHasSchema(values.url),
    })
    if ((res as any)?.error) {
      form.setError("url", { type: "server", message: (res as any).error })
      return
    }
    router.push(memberOrganizationPath(organizationId))
  }

  if (!initial) return null

  return (
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
            <SaveButton type="submit" disabled={form.formState.isSubmitting}>
              Save Changes
            </SaveButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
