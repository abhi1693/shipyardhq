"use client"

import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/atoms/form"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/atoms/select"
import SaveButton from "@/components/molecules/SaveButton"
import PageContainer from "@/components/layout/page-container"

const schema = z.object({
  useCaseId: z.string().min(1, "Select a use case"),
  categoryId: z.string().min(1, "Select a category"),
})

type AssignmentFormInput = z.infer<typeof schema>

export default function EditAssignmentForm({
  prev,
  initial,
  useCases,
  categories,
  onSubmitAction,
}: {
  prev: { useCaseId: string; categoryId: string }
  initial: { useCaseId: string; categoryId: string }
  useCases: { id: string; label: string; slug?: string }[]
  categories: { id: string; name: string; slug?: string }[]
  onSubmitAction: (
    prev: { useCaseId: string; categoryId: string },
    next: { useCaseId: string; categoryId: string },
  ) => Promise<{ success?: boolean; error?: string }>
}) {
  const router = useRouter()

  const form = useForm<AssignmentFormInput>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  })

  async function onSubmit(values: AssignmentFormInput) {
    const result = await onSubmitAction(prev, values)
    if (result?.error) {
      form.setError("useCaseId", { type: "server", message: result.error })
      return
    }
    router.push("/admin/categories/use-cases/assignments")
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Edit Assignment
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Change the use case or category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                name="useCaseId"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Use Case</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a use case" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {useCases.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="categoryId"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
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
