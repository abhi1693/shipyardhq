"use client"

import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { toast } from "sonner"

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
import { updateUseCaseAction } from "@/actions/admin/categories/actions"

const useCaseFormSchema = z.object({
  label: z.string().min(1, "Label is required").max(100, "Label is too long"),
})

type UseCaseFormInput = z.infer<typeof useCaseFormSchema>

export default function EditUseCaseForm({
  id,
  label,
}: {
  id: string
  label: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<UseCaseFormInput>({
    resolver: zodResolver(useCaseFormSchema),
    defaultValues: { label },
  })

  async function onSubmit(values: UseCaseFormInput) {
    startTransition(async () => {
      const result = await updateUseCaseAction(id, values)
      if ("error" in result) {
        form.setError("label", { type: "server", message: result.error })
        return
      }

      toast.success("Use case updated")
      router.push(`/admin/categories/use-cases/${id}`)
    })
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Edit Use Case
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter use case label" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending}>
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

