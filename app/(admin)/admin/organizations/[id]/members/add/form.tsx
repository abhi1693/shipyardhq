"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { createOrganizationMembershipAction } from "@/actions/admin/organizations/actions"
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
import AddButton from "@/components/molecules/AddButton"
import PageContainer from "@/components/layout/page-container"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { adminPath } from "@/lib/routes"

const schema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1, "User is required"),
  jobTitle: z.string().optional(),
})

type InputType = z.infer<typeof schema>

export default function AddOrgMemberForm({
  organizationId,
  users,
}: {
  organizationId: string
  users: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
  }[]
}) {
  const router = useRouter()
  const form = useForm<InputType>({
    resolver: zodResolver(schema),
    defaultValues: { organizationId, userId: "", jobTitle: "" },
  })

  async function onSubmit(values: InputType) {
    const fd = new FormData()
    fd.append("organizationId", values.organizationId)
    fd.append("userId", values.userId)
    if (values.jobTitle) fd.append("jobTitle", values.jobTitle)
    const result = await createOrganizationMembershipAction(fd)
    if ((result as any)?.error) {
      form.setError("userId", {
        type: "server",
        message: (result as any).error,
      })
      return
    }
    router.push(adminPath("organizations", organizationId))
  }

  return (
    <PageContainer>
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
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()}{" "}
                            — {u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Product Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <AddButton
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  label="Add Member"
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
