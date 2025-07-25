"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { createUserAction } from "@/actions/admin/users/actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"

const userFormSchema = z.object({
  clerkId: z.string().min(1, "Clerk ID is required"),
  email: z.email("Invalid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["admin", "member"]),
})

type UserFormInput = z.infer<typeof userFormSchema>

export default function AddUserForm() {
  const router = useRouter()

  const form = useForm<UserFormInput>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      clerkId: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "member",
    },
  })

  async function onSubmit(values: UserFormInput) {
    const formData = new FormData()
    formData.append("clerkId", values.clerkId)
    formData.append("email", values.email)
    formData.append("firstName", values.firstName)
    formData.append("lastName", values.lastName)
    formData.append("role", values.role)

    const result = await createUserAction(formData)

    if (result?.error) {
      form.setError("email", {
        type: "server",
        message: result.error,
      })
      return
    }

    router.push("/admin/users")
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Add User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="clerkId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clerk ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Clerk ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
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
                      <Input placeholder="Enter first name" {...field} />
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
                      <Input placeholder="Enter last name" {...field} />
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
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formState.isSubmitting}>
                Create User
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
