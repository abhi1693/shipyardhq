"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import SaveButton from "@/components/molecules/SaveButton"
import PageContainer from "@/components/layout/page-container"
import { updatePlanFeatureAssignmentAction } from "@/actions/admin/plans/assignments/actions"
import { adminPath } from "@/lib/routes"
import type {
  PlanFeatureAssignment,
  Plan,
  PlanFeature,
} from "@/lib/vendor/prisma/client"

const schema = z.object({
  planId: z.string().min(1, "Plan is required"),
  featureId: z.string().min(1, "Feature is required"),
  enabled: z.boolean().optional(),
  isExperimental: z.boolean().optional(),
})

type FormInput = z.infer<typeof schema>

export default function EditAssignmentForm({
  assignment,
  plans,
  features,
}: {
  assignment: PlanFeatureAssignment & {
    plan: Plan
    feature: PlanFeature
  }
  plans: { id: string; name: string; slug: string }[]
  features: { id: string; name: string; key: string }[]
}) {
  const router = useRouter()

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      planId: assignment.plan.id,
      featureId: assignment.feature.id,
      enabled: assignment.enabled,
      isExperimental: assignment.isExperimental,
    },
  })

  async function onSubmit(values: FormInput) {
    const result = await updatePlanFeatureAssignmentAction(assignment.id, {
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

    router.push(adminPath("plans", "assignments", assignment.id))
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Edit Assignment
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Modify the plan-feature relationship.
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
                            {p.slug ? `${p.name} (${p.slug})` : p.name}
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
                    <FormMessage />
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
