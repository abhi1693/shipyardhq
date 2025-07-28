"use client"

import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Button } from "@/components/atoms/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/atoms/select"
import PageContainer from "@/components/layout/page-container"
import { Category, UseCase } from "@prisma/client"
import { createUseCaseAssignmentAction } from "@/actions/admin/categories/actions"

const schema = z.object({
  useCaseId: z.string().min(1, "Select a use case"),
  categoryId: z.string().min(1, "Select a category"),
})

type AssignmentFormInput = z.infer<typeof schema>

export default function AddUseCaseAssignmentForm({
  categories,
  useCases,
}: {
  categories: Category[]
  useCases: UseCase[]
}) {
  const router = useRouter()

  const form = useForm<AssignmentFormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      useCaseId: "",
      categoryId: "",
    },
  })

  async function onSubmit(values: AssignmentFormInput) {
    const result = await createUseCaseAssignmentAction(values)
    if (result?.error) {
      return form.setError("useCaseId", {
        type: "server",
        message: result.error,
      })
    }
    router.push("/admin/categories/use-cases/assignments")
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Assign Category to Use Case
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="useCaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Use Case</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a use case" />
                        </SelectTrigger>
                        <SelectContent>
                          {useCases.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.label}
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
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formState.isSubmitting}>
                Assign
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
