
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { completeOnboarding } from "@/actions/member/onboarding/actions"
import { toast } from "sonner"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { Label } from "@/components/atoms/label"
import { Checkbox } from "@/components/atoms/checkbox"
import { Separator } from "@/components/atoms/separator"
import { cn } from "@/lib/utils"

const roleIntentOptions = [
  {
    label: "Launch a product",
    value: "launch-product",
    blurb: "Spin up a launch plan, highlight milestones, and track early adopters.",
  },
  {
    label: "Manage a team",
    value: "manage-team",
    blurb: "Coordinate your crew with shared dashboards and smoother workflows.",
  },
  {
    label: "Just exploring",
    value: "explore",
    blurb: "Preview the harbor before you commit, no strings attached.",
  },
]

const heardFromOptions = [
  { label: "Twitter/X", value: "twitter" },
  { label: "Reddit", value: "reddit" },
  { label: "Product Hunt", value: "producthunt" },
  { label: "Hacker News", value: "hackernews" },
  { label: "Google", value: "google" },
  { label: "Discord", value: "discord" },
  { label: "Friend or colleague", value: "friend" },
  { label: "Other", value: "other" },
]

const onboardingSchema = z.object({
  roleIntent: z.string().min(1, "Please select your intent"),
  heardFrom: z.string().min(1, "Please select an option"),
  newsletterOptIn: z.boolean().default(true),
})

type OnboardingFormInput = z.input<typeof onboardingSchema>

export function OnboardingForm({ firstName }: { firstName?: string | null }) {
  const router = useRouter()

  const form = useForm<OnboardingFormInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      roleIntent: "",
      heardFrom: "",
      newsletterOptIn: true,
    },
  })

  const {
    handleSubmit,
    register,
    setValue,
    formState: { errors, isSubmitting },
    watch,
  } = form

  const roleIntent = watch("roleIntent")
  const heardFrom = watch("heardFrom")
  const newsletterOptIn = watch("newsletterOptIn")

  const onSubmit = async (values: OnboardingFormInput) => {
    const formData = new FormData()
    Object.entries(values).forEach(([key, val]) => {
      if (val !== undefined) {
        formData.append(key, val.toString())
      }
    })
    formData.append("acceptedTerms", "true")

    const result = await completeOnboarding(formData)
    if ("success" in result) {
      toast.success("Welcome aboard!")
      router.push("/member/overview")
    } else {
      toast.error(result.error)
    }
  }

  const canSubmit = Boolean(roleIntent && heardFrom)

  return (
    <div className="flex h-full w-full items-center justify-center py-6">
      <Card className="mx-auto w-full max-w-2xl rounded-[26px] border-slate-200/75 bg-white/95 px-0 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur lg:max-w-3xl">
        <CardHeader className="space-y-3 px-10 pt-8">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-200/70 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
            Welcome aboard
          </span>
          <CardTitle className="text-3xl font-semibold tracking-tight text-slate-900">
            {firstName ? `Hi ${firstName}, let's personalize things` : "Let's personalize things"}
          </CardTitle>
          <CardDescription className="max-w-xl text-slate-600">
            Answer a few quick questions so we can tailor dashboards, checklists, and partner perks for your crew.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          <CardContent className="space-y-10 px-10 pb-0">
            <fieldset className="space-y-5">
              <legend className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                Mission focus
              </legend>
              <input type="hidden" {...register("roleIntent")} />
              <div className="grid gap-4 sm:grid-cols-3">
                {roleIntentOptions.map(({ value, label, blurb }) => {
                  const active = roleIntent === value

                  return (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200/80 bg-white px-5 py-5 text-left transition-all hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200",
                        active &&
                          "border-sky-400 bg-sky-50 shadow-[0_18px_45px_-35px_rgba(56,189,248,0.65)]",
                      )}
                      onClick={() =>
                        setValue("roleIntent", value, { shouldValidate: true })
                      }
                    >
                      <span className="text-base font-semibold text-slate-900">
                        {label}
                      </span>
                      {blurb ? (
                        <span className="mt-2 text-sm text-slate-500">{blurb}</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              {errors.roleIntent ? (
                <p className="text-sm font-medium text-rose-500">
                  {errors.roleIntent.message}
                </p>
              ) : null}
            </fieldset>

            <fieldset className="space-y-5">
              <legend className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                How you found us
              </legend>
              <input type="hidden" {...register("heardFrom")} />
              <div className="flex flex-wrap justify-center gap-3">
                {heardFromOptions.map(({ value, label }) => {
                  const active = heardFrom === value

                  return (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "cursor-pointer rounded-full border border-slate-200/80 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all hover:border-sky-300 hover:bg-sky-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200",
                        active &&
                          "border-sky-400 bg-sky-100 text-slate-900 shadow-[0_16px_40px_-30px_rgba(56,189,248,0.55)]",
                      )}
                      onClick={() =>
                        setValue("heardFrom", value, { shouldValidate: true })
                      }
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {errors.heardFrom ? (
                <p className="text-sm font-medium text-rose-500">
                  {errors.heardFrom.message}
                </p>
              ) : null}
            </fieldset>

            <Separator className="bg-slate-200/80" />

            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <Checkbox
                  id="newsletterOptIn"
                  checked={newsletterOptIn ?? true}
                  onCheckedChange={(checked: boolean) =>
                    setValue("newsletterOptIn", checked, { shouldDirty: true })
                  }
                  className="border-slate-300/90 bg-white data-[state=checked]:border-sky-400 data-[state=checked]:bg-sky-100 data-[state=checked]:text-slate-900"
                />
                <Label
                  htmlFor="newsletterOptIn"
                  className="text-sm leading-relaxed text-slate-600"
                >
                  Keep me aboard the Captain&apos;s Log with launch alerts.
                </Label>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 px-10 pb-10 pt-2">
            <Button
              type="submit"
              className="w-full rounded-full bg-sky-500 px-6 py-3 text-base font-semibold text-white shadow-[0_22px_45px_-25px_rgba(56,189,248,0.65)] transition hover:bg-sky-400 focus-visible:ring-sky-200 disabled:opacity-60"
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? "Hoisting sails..." : "Complete Onboarding"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
