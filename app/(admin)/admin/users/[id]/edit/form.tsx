"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { updateUserAction } from "@/actions/admin/users/actions"
import { User } from "@prisma/client"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"

const userFormSchema = z.object({
  email: z.string().email("Invalid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["admin", "member"]),
})

type UserFormInput = z.infer<typeof userFormSchema>

export default function EditUserForm({ user }: { user: User }) {
  const router = useRouter()

  const form = useForm<UserFormInput>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as "admin" | "member",
    },
  })

  async function onSubmit(values: UserFormInput) {
    const result = await updateUserAction(user.id, values)

    if ("error" in result) {
      form.setError("email", {
        type: "server",
        message: result.error,
      })
      return
    }

    router.push(`/admin/users/${user.id}`)
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Edit User
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
                      <Input {...field} placeholder="Enter email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter first name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter last name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
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
    </PageContainer>
  )
}
