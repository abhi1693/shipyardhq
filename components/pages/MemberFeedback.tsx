"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { formatDistanceToNow } from "date-fns"
import { useMemo } from "react"
import { toast } from "sonner"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import { Button } from "@/components/atoms/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import {
  submitMemberFeedback,
  type MemberFeedbackListItem,
} from "@/actions/member/feedback/actions"
import {
  memberFeedbackSchema,
  type MemberFeedbackFormValues,
} from "@/lib/validation/memberFeedback"

const ratings = [
  { label: "1 — Needs work", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5 — Nailed it", value: "5" },
]

export default function MemberFeedback({
  entries,
}: {
  entries: MemberFeedbackListItem[]
}) {
  const router = useRouter()
  const form = useForm<MemberFeedbackFormValues>({
    resolver: zodResolver(memberFeedbackSchema),
    defaultValues: {
      subject: "",
      message: "",
      rating: undefined,
    },
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) =>
      a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : 0,
    )
  }, [entries])

  const onSubmit = async (values: MemberFeedbackFormValues) => {
    const formData = new FormData()
    if (values.subject) formData.append("subject", values.subject)
    formData.append("message", values.message)
    if (values.rating) formData.append("rating", values.rating)

    const result = await submitMemberFeedback(formData)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success("Thanks for the feedback!")
    reset({ subject: "", message: "", rating: undefined })
    router.refresh()
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-6">
      <Card className="border-slate-200/70 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">
            Share feedback
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Tell us what would make Shipyard more useful for you and your crew.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="What's on your mind?"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional headline, up to 120 characters.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How are we doing?</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value ? value : undefined)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Optional rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ratings.map((rating) => (
                            <SelectItem key={rating.value} value={rating.value}>
                              {rating.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        1 = needs work, 5 = nailed it.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={8}
                        cols={72}
                        placeholder="Share details, ideas, or anything that's not working for you."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end border-t border-slate-200/70 bg-slate-50/50 px-6 py-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send feedback"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="border-slate-200/70 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900">
            Recent submissions
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            We review every note and follow up if we have questions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedEntries.length === 0 ? (
            <div className="rounded-lg border border-slate-200/70 bg-slate-50/60 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t shared any feedback yet. Send us a note to help
                shape the harbor.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {sortedEntries.map((entry) => {
                const submittedAt = formatDistanceToNow(
                  new Date(entry.createdAt),
                  { addSuffix: true },
                )
                const rewardGrantedAt = entry.rewardGrantedAt
                  ? formatDistanceToNow(new Date(entry.rewardGrantedAt), {
                      addSuffix: true,
                    })
                  : null

                return (
                  <li
                    key={entry.id}
                    className="space-y-2 rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-xs"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase">
                          {entry.status.replace(/_/g, " ")}
                        </Badge>
                        {typeof entry.rating === "number" ? (
                          <span className="text-xs font-medium text-amber-600">
                            Rating: {entry.rating}/5
                          </span>
                        ) : null}
                        {entry.rewardEligible ? (
                          <Badge
                            variant={entry.rewardGrantedAt ? "default" : "secondary"}
                            className="text-[10px] uppercase"
                          >
                            {entry.rewardGrantedAt
                              ? "Reward granted"
                              : "Reward eligible"}
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Submitted {submittedAt}
                      </span>
                    </div>
                    {entry.subject ? (
                      <p className="text-sm font-semibold text-slate-900">
                        {entry.subject}
                      </p>
                    ) : null}
                    <p className="text-sm leading-relaxed text-slate-700">
                      {entry.message}
                    </p>
                    {entry.adminNote ? (
                      <div className="rounded-lg border border-sky-200/60 bg-sky-50/70 px-3 py-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                          Crew reply
                        </span>
                        <p className="mt-1 text-sm leading-relaxed text-sky-900">
                          {entry.adminNote}
                        </p>
                      </div>
                    ) : null}
                    {entry.rewardEligible ? (
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
                        {entry.rewardGrantedAt
                          ? `Rewards granted ${rewardGrantedAt}`
                          : "Rewards will be granted once this feedback is closed."}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
