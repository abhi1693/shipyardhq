"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import {
  SendBuilderOutreachResponse,
  sendBuilderOutreachEmailsAction,
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
import { Badge } from "@/components/atoms/badge"
import { Heading } from "@/components/atoms/heading"
import PageContainer from "@/components/layout/page-container"
import { Separator } from "@/components/atoms/separator"
import {
  BuilderOutreachEmail,
  BUILDER_OUTREACH_SUBJECT,
} from "@/lib/email/templates/outreach/builderOutreach"
import { parseEmailList } from "@/lib/email/list-parser"
import { deriveFirstNameFromEmail } from "@/lib/email/personalization"

const builderOutreachFormSchema = z.object({
  emails: z
    .string()
    .min(1, "Enter at least one email address")
    .max(5000, "Shorten the list to 5,000 characters or fewer"),
})

type BuilderOutreachFormValues = z.infer<typeof builderOutreachFormSchema>

type EmailSendSummary = {
  totalRecipients: number
  attempted: number
  sent: number
  failed: { email: string; error: string }[]
  invalidEmails: string[]
  sentPercentage: number
  failedPercentage: number
}

export default function BuilderOutreachCenter() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invalidEmails, setInvalidEmails] = useState<string[]>([])
  const [failedRecipients, setFailedRecipients] = useState<
    { email: string; error: string }[]
  >([])
  const [summary, setSummary] = useState<EmailSendSummary | null>(null)

  const form = useForm<BuilderOutreachFormValues>({
    resolver: zodResolver(builderOutreachFormSchema),
    defaultValues: { emails: "" },
  })

  const emailsValue = form.watch("emails")
  const parsedEmails = useMemo(() => parseEmailList(emailsValue), [emailsValue])
  const firstValidEmail = parsedEmails.valid[0] ?? null
  const previewRecipient = firstValidEmail
    ? {
        email: firstValidEmail,
        firstName: deriveFirstNameFromEmail(firstValidEmail) ?? null,
      }
    : null

  const combinedInvalidEmails = useMemo(() => {
    if (parsedEmails.invalid.length === 0 && invalidEmails.length === 0) {
      return []
    }
    const merged = new Map<string, string>()
    for (const email of parsedEmails.invalid) {
      merged.set(email.toLowerCase(), email)
    }
    for (const email of invalidEmails) {
      merged.set(email.toLowerCase(), email)
    }
    return Array.from(merged.values())
  }, [parsedEmails.invalid, invalidEmails])

  async function handleSubmit(values: BuilderOutreachFormValues) {
    const parsed = parseEmailList(values.emails)
    if (parsed.valid.length === 0) {
      setInvalidEmails(parsed.invalid)
      form.setError("emails", {
        type: "manual",
        message:
          parsed.invalid.length > 0
            ? "We could not find any valid email addresses."
            : "Enter at least one email address.",
      })
      toast.error("Add at least one valid email address before sending.")
      return
    }

    form.clearErrors("emails")
    setIsSubmitting(true)
    setInvalidEmails(parsed.invalid)
    setFailedRecipients([])
    setSummary(null)

    const payload = new FormData()
    payload.append("emails", values.emails)

    let response: SendBuilderOutreachResponse | null = null

    try {
      response = await sendBuilderOutreachEmailsAction(payload)
    } catch (error) {
      console.error("Failed to send builder outreach emails", error)
      toast.error("We hit an unexpected error while sending invites.")
      return
    } finally {
      setIsSubmitting(false)
    }

    if (!response) {
      toast.error("We hit an unexpected error while sending invites.")
      return
    }

    if ("error" in response) {
      setInvalidEmails(response.invalidEmails ?? parsed.invalid)
      toast.error(response.error)
      return
    }

    const nextSummary = response.summary
    setInvalidEmails(nextSummary.invalidEmails)
    setFailedRecipients(nextSummary.failed)
    setSummary(nextSummary)

    const successCount = nextSummary.sent
    const failCount = nextSummary.failed.length

    if (successCount > 0) {
      const suffix = successCount === 1 ? "email" : "emails"
      toast.success(
        `Sent ${successCount} ${suffix}. ${nextSummary.sentPercentage}% success.`,
      )
    }

    if (failCount > 0) {
      toast.warning(
        failCount === 1
          ? "One outreach email failed to send. Review the delivery details below."
          : `${failCount} outreach emails failed to send. Review the delivery details below.`,
      )
    }
  }

  return (
    <PageContainer>
      <div className="flex flex-col space-y-8 py-6">
        <Heading
          title="Builder outreach"
          description="Invite potential builders with our prewritten email template."
        />
        <Separator />
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <Card className="space-y-6">
            <CardHeader>
              <CardTitle>Send invites</CardTitle>
              <CardDescription>
                Paste email addresses—one per line or separated by commas. We
                will dedupe the list and send the outreach template for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  className="space-y-6"
                  onSubmit={form.handleSubmit(handleSubmit)}
                >
                  <div className="space-y-2">
                    <FormLabel>Subject</FormLabel>
                    <Input
                      value={BUILDER_OUTREACH_SUBJECT}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      className="cursor-not-allowed border-slate-200 bg-slate-50 text-slate-600"
                    />
                    <p className="text-xs text-muted-foreground">
                      The builder outreach template ships with this fixed
                      subject line.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="emails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email addresses</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={8}
                            placeholder="builder@example.com, maker@example.com"
                            className="min-h-[12rem]"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Add one or more emails. Separate them with commas or
                          new lines; we handle formatting and duplicates.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <Badge variant="secondary">
                            {parsedEmails.valid.length} recipient
                            {parsedEmails.valid.length === 1 ? "" : "s"}{" "}
                            detected
                          </Badge>
                          {parsedEmails.invalid.length > 0 ? (
                            <span className="text-amber-600">
                              {parsedEmails.invalid.length} will be skipped
                              unless corrected.
                            </span>
                          ) : null}
                        </div>
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
                      {isSubmitting ? "Sending..." : "Send outreach"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>Template preview</CardTitle>
                <CardDescription>
                  Personalizes with the first valid email address you add.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[32rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-0">
                <div className="border-b border-slate-200 bg-slate-100/70 px-4 py-2 text-xs text-slate-600">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-700">
                      Subject: {BUILDER_OUTREACH_SUBJECT}
                    </span>
                    <span>
                      {previewRecipient?.email
                        ? `Previewing as ${previewRecipient.email}`
                        : "Add at least one email to personalize the greeting"}
                    </span>
                  </div>
                </div>
                <div className="h-[28rem] overflow-y-auto bg-white">
                  <BuilderOutreachEmail
                    firstName={previewRecipient?.firstName ?? undefined}
                    renderMode="preview"
                  />
                </div>
              </CardContent>
            </Card>

            {combinedInvalidEmails.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <p className="font-semibold">These addresses were skipped</p>
                <p className="break-words">
                  {combinedInvalidEmails.join(", ")}
                </p>
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

            {summary ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Outreach summary
                </p>
                <dl className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs text-slate-500">Total recipients</dt>
                    <dd className="text-base font-semibold text-slate-900">
                      {summary.totalRecipients}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Sent</dt>
                    <dd className="text-base font-semibold text-emerald-600">
                      {summary.sent} ({summary.sentPercentage}%)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Failed</dt>
                    <dd className="text-base font-semibold text-rose-600">
                      {summary.failed.length} ({summary.failedPercentage}%)
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
