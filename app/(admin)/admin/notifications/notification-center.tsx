"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import Link from "next/link"

import {
  NotificationSegment,
  SegmentCounts,
  SendNotificationResponse,
  NotificationUser,
  getSegmentPreviewRecipient,
  sendNotificationEmailsAction,
} from "@/actions/admin/notifications/actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import { Separator } from "@/components/atoms/separator"
import { Heading } from "@/components/atoms/heading"
import PageContainer from "@/components/layout/page-container"
import { Badge } from "@/components/atoms/badge"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/atoms/checkbox"
import { deriveFirstNameFromEmail } from "@/lib/email/personalization"
import AdminEmailPreview from "./preview"
import PreviewSkeleton from "./preview-skeleton"
import { adminPath } from "@/lib/routes"

const SEGMENT_SCHEMA = z.enum([
  "registered",
  "builders",
  "explorers",
  "withProducts",
  "withoutProducts",
  "buildersWithProducts",
  "buildersWithoutProducts",
  "explorersWithoutProducts",
  "selected",
])

const formSchema = z
  .object({
    segment: SEGMENT_SCHEMA,
    subject: z.string().min(1, "Subject is required"),
    message: z
      .string()
      .min(1, "Write a message to send")
      .max(8000, "Message exceeds the 8,000 character limit"),
    selectedUserIds: z.array(z.string()).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.segment === "selected") {
      const selected = values.selectedUserIds ?? []
      if (selected.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose at least one member",
          path: ["selectedUserIds"],
        })
      }
    }
  })

type NotificationFormValues = z.infer<typeof formSchema>

type SegmentOption = {
  value: NotificationSegment
  label: string
  blurb: string
  count?: number
}

type NotificationCenterProps = {
  segmentCounts: SegmentCounts
  users: NotificationUser[]
}

export default function NotificationCenter({
  segmentCounts,
  users,
}: NotificationCenterProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invalidEmails, setInvalidEmails] = useState<string[]>([])
  const [failedRecipients, setFailedRecipients] = useState<
    { email: string; error: string }[]
  >([])
  const [previewRecipient, setPreviewRecipient] = useState<{
    email: string
    firstName: string | null
  } | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [summaryStats, setSummaryStats] = useState<{
    totalRecipients: number
    sent: number
    failed: number
    sentPercentage: number
    failedPercentage: number
  } | null>(null)

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      segment: "registered",
      subject: "",
      message: "",
      selectedUserIds: [],
    },
  })

  const segmentOptions = useMemo<SegmentOption[]>(
    () => [
      {
        value: "registered",
        label: "All registered users",
        blurb: "Reach every active member in the Harbor.",
        count: segmentCounts.registered,
      },
      {
        value: "builders",
        label: "Builders",
        blurb: "People who joined to launch or manage products.",
        count: segmentCounts.builders,
      },
      {
        value: "buildersWithProducts",
        label: "Builders with products",
        blurb:
          "Builders who already shipped something and can handle advanced updates.",
        count: segmentCounts.buildersWithProducts,
      },
      {
        value: "buildersWithoutProducts",
        label: "Builders without products",
        blurb: "Builders still gearing up for their first launch.",
        count: segmentCounts.buildersWithoutProducts,
      },
      {
        value: "explorers",
        label: "Explorers",
        blurb: "Members browsing the community for inspiration.",
        count: segmentCounts.explorers,
      },
      {
        value: "explorersWithoutProducts",
        label: "Explorers without products",
        blurb: "Explorers who have yet to list anything in the Harbor.",
        count: segmentCounts.explorersWithoutProducts,
      },
      {
        value: "withProducts",
        label: "With products",
        blurb: "Makers who already listed at least one product.",
        count: segmentCounts.withProducts,
      },
      {
        value: "withoutProducts",
        label: "Without products",
        blurb: "Members who have not shipped anything yet.",
        count: segmentCounts.withoutProducts,
      },
      {
        value: "selected",
        label: "Selected members",
        blurb: "Hand-pick one or more members to receive this message.",
      },
    ],
    [segmentCounts],
  )

  const selectedSegmentRaw =
    useWatch<NotificationFormValues>({
      control: form.control,
      name: "segment",
    }) ?? "registered"
  const selectedSegment: NotificationSegment = Array.isArray(
    selectedSegmentRaw,
  )
    ? (selectedSegmentRaw[0] as NotificationSegment | undefined) ?? "registered"
    : (selectedSegmentRaw as NotificationSegment)
  const selectedUserIdsRaw =
    useWatch<NotificationFormValues>({
      control: form.control,
      name: "selectedUserIds",
    }) ?? []
  const selectedUserIds = Array.isArray(selectedUserIdsRaw)
    ? selectedUserIdsRaw
    : [selectedUserIdsRaw].filter((value): value is string => Boolean(value))
  const selectedUserKey = selectedUserIds.join(",")
  const subjectRaw =
    useWatch<NotificationFormValues>({
      control: form.control,
      name: "subject",
    }) ?? ""
  const subjectValue = Array.isArray(subjectRaw)
    ? subjectRaw[0] ?? ""
    : subjectRaw
  const messageRaw =
    useWatch<NotificationFormValues>({
      control: form.control,
      name: "message",
    }) ?? ""
  const messageValue = Array.isArray(messageRaw) ? messageRaw[0] ?? "" : messageRaw

  useEffect(() => {
    if (!selectedSegment) {
      setPreviewRecipient(null)
      setIsPreviewLoading(false)
      return
    }

    if (selectedSegment === "selected") {
      const ids = selectedUserKey
        ? selectedUserKey.split(",").filter(Boolean)
        : []

      if (ids.length === 0) {
        setPreviewRecipient(null)
      } else {
        const target = users.find((user) => user.id === ids[0])
        setPreviewRecipient(
          target
            ? {
                email: target.email,
                firstName:
                  target.firstName ??
                  deriveFirstNameFromEmail(target.email) ??
                  null,
              }
            : null,
        )
      }

      setIsPreviewLoading(false)
      return
    }

    let isActive = true
    setIsPreviewLoading(true)

    getSegmentPreviewRecipient({
      segment: selectedSegment,
    })
      .then((recipient) => {
        if (!isActive) return
        setPreviewRecipient(recipient)
      })
      .catch(() => {
        if (!isActive) return
        setPreviewRecipient(null)
      })
      .finally(() => {
        if (!isActive) return
        setIsPreviewLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [selectedSegment, selectedUserKey, users])

  async function handleSubmit(values: NotificationFormValues) {
    setIsSubmitting(true)
    setInvalidEmails([])
    setFailedRecipients([])
    setSummaryStats(null)

    const payload = new FormData()
    payload.append("segment", values.segment)
    payload.append("subject", values.subject)
    payload.append("message", values.message)
    if (values.segment === "selected") {
      values.selectedUserIds?.forEach((id) => {
        payload.append("selectedUserIds", id)
      })
    }

    let response: SendNotificationResponse | null = null

    try {
      response = await sendNotificationEmailsAction(payload)
    } catch (error) {
      console.error("Failed to send notifications", error)
      toast.error("We hit an unexpected error while sending emails.")
      return
    } finally {
      setIsSubmitting(false)
    }

    if (!response) {
      toast.error("We hit an unexpected error while sending emails.")
      return
    }

    if ("error" in response) {
      setInvalidEmails(response.invalidEmails ?? [])
      toast.error(response.error)
      return
    }

    const summary = response.summary
    setInvalidEmails(summary.invalidEmails ?? [])
    setFailedRecipients(summary.failed)
    setSummaryStats({
      totalRecipients: summary.totalRecipients,
      sent: summary.sent,
      failed: summary.failed.length,
      sentPercentage: summary.sentPercentage,
      failedPercentage: summary.failedPercentage,
    })

    const successCount = summary.sent
    const failCount = summary.failed.length

    if (successCount > 0) {
      const suffix = successCount === 1 ? "email" : "emails"
      toast.success(
        `Sent ${successCount} ${suffix}. ${summary.sentPercentage}% success.`,
      )
    }
    if (failCount > 0) {
      toast.warning(
        failCount === 1
          ? "One email failed to send. Check the delivery details below."
          : `${failCount} emails failed to send. Check the delivery details below.`,
      )
    }
  }

  return (
    <PageContainer>
      <div className="flex flex-col space-y-8 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Heading
            title="Notification Center"
            description="Send on-demand announcements to the right members."
          />
          <Button asChild variant="outline">
            <Link href={adminPath("notifications", "outreach")}>
              Builder outreach
            </Link>
          </Button>
        </div>
        <Separator />
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <Card className="space-y-6">
            <CardHeader>
              <CardTitle>Compose message</CardTitle>
              <CardDescription>
                Pick a recipient group, craft your note, and Shipyard will
                deliver it via Resend.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  className="space-y-6"
                  onSubmit={form.handleSubmit(handleSubmit)}
                >
                  <FormField
                    control={form.control}
                    name="segment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Audience</FormLabel>
                        <FormControl>
                          <input type="hidden" {...field} />
                        </FormControl>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {segmentOptions.map((option) => {
                            const isActive = selectedSegment === option.value
                            const labelId = `segment-${option.value}`
                            let badgeLabel: string
                            if (typeof option.count === "number") {
                              badgeLabel = `${option.count} recipients`
                            } else if (option.value === "selected") {
                              badgeLabel =
                                selectedUserIds.length > 0
                                  ? `${selectedUserIds.length} selected`
                                  : "Pick members"
                            } else {
                              badgeLabel = "Segment"
                            }
                            return (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={isActive}
                                aria-labelledby={labelId}
                                className={cn(
                                  "flex h-full flex-col items-start rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200",
                                  isActive &&
                                    "border-sky-400 bg-sky-50 shadow-[0_18px_48px_-32px_rgba(56,189,248,0.65)]",
                                )}
                                onClick={() => field.onChange(option.value)}
                              >
                                <div className="flex w-full items-center justify-between gap-2">
                                  <span
                                    id={labelId}
                                    className="text-base font-semibold text-slate-900"
                                  >
                                    {option.label}
                                  </span>
                                  <Badge
                                    variant={isActive ? "secondary" : "outline"}
                                  >
                                    {badgeLabel}
                                  </Badge>
                                </div>
                                <span className="mt-2 text-sm text-slate-600">
                                  {option.blurb}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedSegment === "selected" ? (
                    <FormField
                      control={form.control}
                      name="selectedUserIds"
                      render={() => (
                        <FormItem>
                          <FormLabel>Select members</FormLabel>
                          {users.length > 0 ? (
                            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="grid gap-2">
                                {users.map((user) => {
                                  const checked = selectedUserIds.includes(
                                    user.id,
                                  )
                                  const nameParts = [
                                    user.firstName,
                                    user.lastName,
                                  ]
                                    .filter(Boolean)
                                    .map((part) => part?.toString() ?? "")
                                  const displayName = nameParts.join(" ").trim()
                                  const fallbackName =
                                    displayName ||
                                    deriveFirstNameFromEmail(user.email) ||
                                    ""
                                  return (
                                    <label
                                      key={user.id}
                                      className="flex items-start gap-3 rounded-lg bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(next) => {
                                          const isChecked = Boolean(next)
                                          if (isChecked) {
                                            const nextIds = Array.from(
                                              new Set([
                                                ...selectedUserIds,
                                                user.id,
                                              ]),
                                            )
                                            form.setValue(
                                              "selectedUserIds",
                                              nextIds,
                                              {
                                                shouldValidate: true,
                                              },
                                            )
                                          } else {
                                            form.setValue(
                                              "selectedUserIds",
                                              selectedUserIds.filter(
                                                (id) => id !== user.id,
                                              ),
                                              { shouldValidate: true },
                                            )
                                          }
                                        }}
                                      />
                                      <span className="text-sm text-slate-700">
                                        {fallbackName || user.email}
                                        <span className="block text-xs text-slate-500">
                                          {user.email}
                                        </span>
                                      </span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                              No active members available.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="Subject line" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share updates, announcements, or offers."
                            rows={12}
                            className="min-h-[20rem]"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Markdown supported — use headings, lists, links, and
                          code snippets for richer broadcasts.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-w-[150px]"
                    >
                      {isSubmitting ? "Sending..." : "Send email"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>Email preview</CardTitle>
                <CardDescription>
                  Live rendering of the Resend template with your content.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[32rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-0">
                <div className="border-b border-slate-200 bg-slate-100/70 px-4 py-2 text-xs font-medium text-slate-600">
                  {isPreviewLoading
                    ? "Loading sample recipient..."
                    : previewRecipient?.email
                      ? `Previewing as ${previewRecipient.email}`
                      : "Previewing with a generic recipient"}
                </div>
                <div className="h-[28rem] overflow-y-auto bg-white">
                  {isPreviewLoading ? (
                    <PreviewSkeleton />
                  ) : (
                    <AdminEmailPreview
                      subject={subjectValue}
                      message={messageValue}
                      recipient={previewRecipient ?? undefined}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {invalidEmails.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <p className="font-semibold">Some emails were skipped</p>
                <p>{invalidEmails.join(", ")}</p>
              </div>
            ) : null}
            {failedRecipients.length > 0 ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <p className="font-semibold">Delivery issues</p>
                <ul className="mt-1 space-y-1">
                  {failedRecipients.map((entry) => (
                    <li key={entry.email}>
                      {entry.email} — {entry.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {summaryStats ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Delivery summary
                </p>
                <dl className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs text-slate-500">Total recipients</dt>
                    <dd className="text-base font-semibold text-slate-900">
                      {summaryStats.totalRecipients}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Sent</dt>
                    <dd className="text-base font-semibold text-emerald-600">
                      {summaryStats.sent} ({summaryStats.sentPercentage}%)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Failed</dt>
                    <dd className="text-base font-semibold text-rose-600">
                      {summaryStats.failed} ({summaryStats.failedPercentage}%)
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
