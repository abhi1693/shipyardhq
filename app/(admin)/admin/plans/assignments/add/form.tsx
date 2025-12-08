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
import { Checkbox } from "@/components/atoms/checkbox"
import { Button } from "@/components/atoms/button"
import PageContainer from "@/components/layout/page-container"
import { createPlanFeatureAssignment } from "@/actions/admin/plans/assignments/actions"
import { adminPath } from "@/lib/routes"

const schema = z
  .object({
    planId: z.string().min(1, "Select a plan"),
    featureId: z.string().min(1, "Select a feature"),
    enabled: z.boolean().optional(),
    isExperimental: z.boolean().optional(),
  })

type AssignmentFormInput = z.infer<typeof schema>

export default function AddAssignmentForm({
  plans,
  features,
}: {
  plans: { id: string; name: string }[]
  features: { id: string; name: string; key: string }[]
}) {
  const router = useRouter()

  const form = useForm<AssignmentFormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      planId: "",
      featureId: "",
      enabled: true,
      isExperimental: false,
    },
  })

  async function onSubmit(values: AssignmentFormInput) {
    const result = await createPlanFeatureAssignment({
      planId: values.planId,
      featureId: values.featureId,
      enabled: values.enabled,
      isExperimental: values.isExperimental,
      usageLimit: null,
      usageInterval: null,
    })

    if (result?.error) {
      form.setError("planId", { type: "server", message: result.error })
      return
    }

    router.push(adminPath("plans", "assignments"))
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Assign Feature
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Link a feature to a plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                name="planId"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="featureId"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feature</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a feature" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {features.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} ({f.key})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="enabled"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Enabled</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                name="isExperimental"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Experimental</FormLabel>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Assign Feature
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
