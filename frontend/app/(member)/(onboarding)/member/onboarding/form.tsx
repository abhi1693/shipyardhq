"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useTransition } from "react"
import {
  IconBrandDiscord,
  IconBrandGoogle,
  IconBrandProducthunt,
  IconBrandReddit,
  IconBrandFacebook,
  IconBrandLinkedin,
  IconBrandX,
  IconCompass,
  IconDots,
  IconNews,
  IconRocket,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"
import { ADMIN_BASE_PATH } from "@/lib/routes"
import {
  MEMBER_BASE_PATH,
  MEMBER_ONBOARDING_PATH,
  MEMBER_OVERVIEW_PATH,
} from "@/lib/routes"
import { useCompleteMemberOnboardingApiV1MemberOnboardingCompletePost } from "@/lib/generated/fastapi/member"
import type { FastApiError } from "@/lib/fastapi-fetcher"

const roleIntentOptions = [
  {
    label: "Launch a product",
    value: "launch-product",
    icon: IconRocket,
  },
  {
    label: "Manage a team",
    value: "manage-team",
    icon: IconUsersGroup,
  },
  {
    label: "Just exploring",
    value: "explore",
    icon: IconCompass,
  },
]

const heardFromOptions = [
  { label: "Twitter/X", value: "twitter", icon: IconBrandX },
  { label: "Reddit", value: "reddit", icon: IconBrandReddit },
  { label: "Product Hunt", value: "producthunt", icon: IconBrandProducthunt },
  { label: "Hacker News", value: "hackernews", icon: IconNews },
  { label: "Google", value: "google", icon: IconBrandGoogle },
  { label: "Discord", value: "discord", icon: IconBrandDiscord },
  { label: "Friend or colleague", value: "friend", icon: IconUsers },
  { label: "LinkedIn", value: "linkedin", icon: IconBrandLinkedin },
  { label: "Facebook", value: "facebook", icon: IconBrandFacebook },
  { label: "Other", value: "other", icon: IconDots },
]

const onboardingSchema = z.object({
  roleIntent: z.string().min(1, "Please select your intent"),
  heardFrom: z.string().min(1, "Please select an option"),
})

type OnboardingFormInput = z.input<typeof onboardingSchema>

function getFastApiErrorDetail(error: unknown, fallback: string) {
  const detail = (error as FastApiError | undefined)?.info as
    | { detail?: unknown }
    | undefined
  if (typeof detail?.detail === "string") {
    return detail.detail
  }
  return fallback
}

export function OnboardingForm({
  firstName,
  redirectTo,
  redirectSource,
}: {
  firstName?: string | null
  redirectTo?: string
  redirectSource?: string
}) {
  const router = useRouter()
  const [isNavigating, startTransition] = useTransition()
  const completeOnboardingMutation =
    useCompleteMemberOnboardingApiV1MemberOnboardingCompletePost()

  const form = useForm<OnboardingFormInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      roleIntent: "",
      heardFrom: "",
    },
  })

  const {
    handleSubmit,
    register,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = form

  const roleIntent =
    useWatch({
      control,
      name: "roleIntent",
    }) ?? ""
  const heardFrom =
    useWatch({
      control,
      name: "heardFrom",
    }) ?? ""

  const sanitizedRedirectTarget =
    redirectTo &&
    redirectTo.startsWith("/") &&
    !redirectTo.startsWith("//") &&
    !redirectTo.startsWith(ADMIN_BASE_PATH) &&
    !redirectTo.startsWith(MEMBER_ONBOARDING_PATH)
      ? redirectTo
      : undefined
  const redirectTargetPathname = sanitizedRedirectTarget
    ? sanitizedRedirectTarget.replace(/[?#].*$/, "")
    : ""
  const redirectRewardsToMember =
    redirectTargetPathname.startsWith(MEMBER_BASE_PATH)
  const fromNavbar = redirectSource === "navbar"

  const onSubmit = async (values: OnboardingFormInput) => {
    try {
      await completeOnboardingMutation.mutateAsync({
        data: {
          roleIntent: values.roleIntent,
          heardFrom: values.heardFrom,
        },
      })
      toast.success("Welcome aboard!")
      const shouldUseRedirectTarget =
        Boolean(sanitizedRedirectTarget) &&
        (redirectRewardsToMember ||
          (fromNavbar && values.roleIntent === "explore"))
      const destination = shouldUseRedirectTarget
        ? (sanitizedRedirectTarget ?? MEMBER_OVERVIEW_PATH)
        : MEMBER_OVERVIEW_PATH
      startTransition(() => {
        router.replace(destination)
        router.refresh()
      })
    } catch (error) {
      toast.error(
        getFastApiErrorDetail(error, "Unable to finish setup right now."),
      )
    }
  }

  const canSubmit = Boolean(roleIntent && heardFrom)
  const isBusy = isSubmitting || isNavigating || completeOnboardingMutation.isPending

  return (
    <div className="flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 lg:px-10">
      <Card className="relative w-full max-w-3xl overflow-hidden border-slate-200/80 bg-white shadow-[0_22px_70px_-45px_rgba(15,23,42,0.55)]">
        <CardHeader className="space-y-3 border-b border-slate-100 px-8 pb-6 pt-8">
          <CardTitle className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-slate-900">
            <span aria-hidden>⛵️</span>
            <span>
              {firstName ? `Welcome, ${firstName}` : "Set up your workspace"}
            </span>
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <CardContent className="space-y-8 px-8 pb-0 pt-6">
            <fieldset className="space-y-2">
              <legend className="text-base font-semibold text-slate-700">
                What brings you here?
              </legend>
              <input type="hidden" {...register("roleIntent")} />
              <div className="flex flex-wrap gap-2">
                {roleIntentOptions.map(({ value, label, icon: Icon }) => {
                  const active = roleIntent === value

                  return (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        "group inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition cursor-pointer",
                        active
                          ? "border-sky-300 bg-sky-50 text-slate-900 shadow-sm"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                      )}
                      onClick={() =>
                        setValue("roleIntent", value, { shouldValidate: true })
                      }
                    >
                      {Icon ? (
                        <span
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full",
                            active
                              ? "bg-sky-100 text-sky-800"
                              : "bg-slate-100 text-slate-700",
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                      ) : null}
                      <span>{label}</span>
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

            <fieldset className="space-y-2">
              <legend className="text-base font-semibold text-slate-700">
                How you found us?
              </legend>
              <input type="hidden" {...register("heardFrom")} />
              <div className="flex flex-wrap gap-2">
                {heardFromOptions.map(({ value, label, icon: Icon }) => {
                  const active = heardFrom === value

                  return (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        "group inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition cursor-pointer",
                        active
                          ? "border-sky-300 bg-sky-50 text-slate-900 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
                      )}
                      onClick={() =>
                        setValue("heardFrom", value, { shouldValidate: true })
                      }
                    >
                      {Icon ? (
                        <span
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full",
                            active
                              ? "bg-sky-100 text-sky-800"
                              : "bg-slate-100 text-slate-700",
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                      ) : null}
                      <span>{label}</span>
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
          </CardContent>

          <CardFooter className="flex flex-col gap-2 px-8 pb-8 pt-2">
            <Button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-800 focus-visible:ring-slate-900/20 disabled:opacity-60"
              disabled={isBusy || !canSubmit}
            >
              {isBusy ? "Saving..." : "Finish setup"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
