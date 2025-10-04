"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import SaveButton from "@/components/molecules/SaveButton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Switch } from "@/components/atoms/switch"
import PageContainer from "@/components/layout/page-container"
import {
  createRewardRuleAction,
  updateRewardRuleAction,
} from "@/actions/admin/points/actions"
import { adminPath } from "@/lib/routes"
import {
  RewardRule,
  RewardRuleCategory,
} from "@/lib/vendor/prisma/client"

const optionalNumber = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (value == null || value === "") return true
    return /^\d+$/.test(value)
  }, "Enter a whole number")

const requiredPositiveNumber = z
  .string()
  .trim()
  .min(1, "Enter base rewards")
  .refine((value) => /^\d+$/.test(value) && Number(value) > 0, {
    message: "Enter a value greater than zero",
  })

const jsonString = z
  .string()
  .optional()
  .refine((value) => {
    if (!value) return true
    try {
      JSON.parse(value)
      return true
    } catch {
      return false
    }
  }, "Must be valid JSON")

const ruleFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  key: z.string().min(1, "Key is required"),
  description: z.string().optional(),
  category: z.nativeEnum(RewardRuleCategory, {
    message: "Select a category",
  }),
  basePoints: requiredPositiveNumber,
  dailyCap: optionalNumber,
  lifetimeCap: optionalNumber,
  globalCooldownSeconds: optionalNumber,
  perTargetCooldownSeconds: optionalNumber,
  metadata: jsonString,
  tierConfig: jsonString,
  adminNotes: z.string().optional(),
  isActive: z.boolean().default(true),
})

type RuleFormValues = z.input<typeof ruleFormSchema>

type RuleFormProps = {
  mode: "create" | "edit"
  rule?: RewardRule
}

const categoryOptions = Object.values(RewardRuleCategory)

export default function RuleForm({ mode, rule }: RuleFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: rule?.name ?? "",
      key: rule?.key ?? "",
      description: rule?.description ?? "",
      category: rule?.category ?? RewardRuleCategory.engagement,
      basePoints: rule ? String(rule.basePoints) : "10",
      dailyCap: rule?.dailyCap != null ? String(rule.dailyCap) : undefined,
      lifetimeCap:
        rule?.lifetimeCap != null ? String(rule.lifetimeCap) : undefined,
      globalCooldownSeconds:
        rule?.globalCooldownSeconds != null
          ? String(rule.globalCooldownSeconds)
          : undefined,
      perTargetCooldownSeconds:
        rule?.perTargetCooldownSeconds != null
          ? String(rule.perTargetCooldownSeconds)
          : undefined,
      metadata: rule?.metadata ? JSON.stringify(rule.metadata, null, 2) : "",
      tierConfig: rule?.tierConfig
        ? JSON.stringify(rule.tierConfig, null, 2)
        : "",
      adminNotes: rule?.adminNotes ?? "",
      isActive: rule?.isActive ?? true,
    },
  })

  async function onSubmit(values: RuleFormValues) {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("name", values.name)
        formData.set("key", values.key)
        formData.set("category", values.category)
        formData.set("basePoints", String(values.basePoints))
        formData.set("isActive", values.isActive ? "true" : "false")
        if (values.description) formData.set("description", values.description)
        if (values.dailyCap != null) {
          formData.set("dailyCap", String(values.dailyCap))
        }
        if (values.lifetimeCap != null) {
          formData.set("lifetimeCap", String(values.lifetimeCap))
        }
        if (values.globalCooldownSeconds != null) {
          formData.set("globalCooldownSeconds", String(values.globalCooldownSeconds))
        }
        if (values.perTargetCooldownSeconds != null) {
          formData.set(
            "perTargetCooldownSeconds",
            String(values.perTargetCooldownSeconds),
          )
        }
        if (values.metadata) formData.set("metadata", values.metadata)
        if (values.tierConfig) formData.set("tierConfig", values.tierConfig)
        if (values.adminNotes) formData.set("adminNotes", values.adminNotes)

        const result =
          mode === "create"
            ? await createRewardRuleAction(formData)
            : await updateRewardRuleAction(rule!.id, formData)

        if (result?.error) {
          toast.error(result.error)
          return
        }

        toast.success(
          mode === "create" ? "Reward rule created" : "Reward rule updated",
        )
        router.push(adminPath("rewards", "rules"))
      } catch (error) {
        console.error(error)
        toast.error("We hit an error saving the rule")
      }
    })
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            {mode === "create" ? "Create reward rule" : "Edit reward rule"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Daily login" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="rewards.login"
                          {...field}
                          disabled={mode === "edit"}
                        />
                      </FormControl>
                      <FormDescription>
                        Immutable identifier used by the rewards engine.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
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
                  name="basePoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base rewards</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} step={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Short summary of when this rule triggers"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dailyCap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily cap</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={1} {...field} />
                      </FormControl>
                      <FormDescription>Leave blank for unlimited.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lifetimeCap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lifetime cap</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={1} {...field} />
                      </FormControl>
                      <FormDescription>Leave blank for unlimited.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="globalCooldownSeconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Global cooldown (seconds)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        Minimum wait before the same user can trigger this rule again.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="perTargetCooldownSeconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Per-target cooldown (seconds)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        Applies when the event is tied to a specific product or source.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="metadata"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metadata (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={`{
  "bonus": 2
}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tierConfig"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier config (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={`{
  "tiers": []
}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="adminNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Internal notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-input bg-muted/30 px-3 py-2">
                    <div className="space-y-1">
                      <FormLabel>Rule active</FormLabel>
                      <FormDescription>
                        Disabled rules are ignored by the rewards engine.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <SaveButton type="submit" disabled={isPending}>
                {mode === "create" ? "Create rule" : "Save changes"}
              </SaveButton>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
