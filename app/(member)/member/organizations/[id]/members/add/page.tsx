"use client"

import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { addMyOrganizationMemberAction } from "@/actions/member/organizations/actions"
import { memberOrganizationPath } from "@/lib/routes"
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

const schema = z.object({
  email: z.string().email("Enter a valid email"),
})

type Values = z.infer<typeof schema>

export default function AddMemberPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: Values) {
    const res = await addMyOrganizationMemberAction(id as string, values.email)
    if ((res as any)?.error) {
      form.setError("email", { type: "server", message: (res as any).error })
      return
    }
    router.push(memberOrganizationPath(id as string))
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">
          Add Member
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
                  <FormLabel>User Email</FormLabel>
                  <FormControl>
                    <Input placeholder="jane@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CreateButton
              type="submit"
              disabled={form.formState.isSubmitting}
              label="Add Member"
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
