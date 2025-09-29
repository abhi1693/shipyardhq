"use client"

import { useEffect, useMemo } from "react"
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
import { Input } from "@/components/atoms/input"
import PageContainer from "@/components/layout/page-container"
import { createPlanFeatureAssignment } from "@/actions/admin/plans/assignments/actions"
import { adminPath } from "@/lib/routes"
import { INSIGHTS_PIPELINE_FEATURE_KEY } from "@/lib/constants"
import {
  INSIGHTS_USAGE_INTERVAL_OPTIONS,
  INSIGHTS_USAGE_INTERVALS,
} from "@/lib/productInsights/insightsUsage"
import type { TimeInterval } from "@/lib/vendor/prisma/client"

const schema = z
  .object({
    planId: z.string().min(1, "Select a plan"),
    featureId: z.string().min(1, "Select a feature"),
    enabled: z.boolean().optional(),
    isExperimental: z.boolean().optional(),
    usageLimit: z
      .string()
      .optional()
      .refine(
        (value) =>
          !value || (!Number.isNaN(Number(value)) && Number(value) > 0),
        "Usage limit must be a positive number",
      ),
    usageInterval: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasUsageLimit = Boolean(data.usageLimit && data.usageLimit.trim())
    if (
      hasUsageLimit &&
      (!data.usageInterval ||
        !INSIGHTS_USAGE_INTERVALS.includes(data.usageInterval as TimeInterval))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usageInterval"],
        message: "Select an interval",
      })
    }
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
      usageLimit: "",
      usageInterval: "",
    },
  })

  const watchedFeatureId = form.watch("featureId")
  const selectedFeature = useMemo(
    () => features.find((f) => f.id === watchedFeatureId),
    [features, watchedFeatureId],
  )

  const requiresUsageConfig =
    selectedFeature?.key === INSIGHTS_PIPELINE_FEATURE_KEY

  const watchedUsageLimit = form.watch("usageLimit")

  const isValidInterval = (value: string | undefined): value is TimeInterval =>
    value ? INSIGHTS_USAGE_INTERVALS.includes(value as TimeInterval) : false

  useEffect(() => {
    if (!requiresUsageConfig) {
      form.setValue("usageLimit", "")
      form.setValue("usageInterval", "")
    }
  }, [form, requiresUsageConfig])

  useEffect(() => {
    if (!watchedUsageLimit?.trim()) {
      form.setValue("usageInterval", "")
    }
  }, [form, watchedUsageLimit])

  async function onSubmit(values: AssignmentFormInput) {
    const usageLimitValue = values.usageLimit?.trim()
      ? Number(values.usageLimit)
      : null

    if (values.usageLimit && Number.isNaN(usageLimitValue)) {
      form.setError("usageLimit", {
        type: "manual",
        message: "Usage limit must be a number",
      })
      return
    }

    const usageIntervalValue = isValidInterval(values.usageInterval)
      ? values.usageInterval
      : null

    const result = await createPlanFeatureAssignment({
      planId: values.planId,
      featureId: values.featureId,
      enabled: values.enabled,
      isExperimental: values.isExperimental,
      usageLimit: requiresUsageConfig ? usageLimitValue : null,
      usageInterval: requiresUsageConfig ? usageIntervalValue : null,
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
              {requiresUsageConfig ? (
                <div className="space-y-4 rounded-lg border border-dashed border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Usage policy
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Leave the limit blank for unlimited runs. Limits apply per
                      product.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      name="usageLimit"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Runs allowed</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              placeholder="Unlimited"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="usageInterval"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            disabled={!form.watch("usageLimit")?.trim()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select interval" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INSIGHTS_USAGE_INTERVAL_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ) : null}
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
