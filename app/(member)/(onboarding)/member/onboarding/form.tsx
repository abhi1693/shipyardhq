"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { completeOnboarding } from "@/actions/member/onboarding/actions"
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
  IconLoader2,
} from "@tabler/icons-react"

import { BrandLogo } from "@/components/atoms/brand-logo"
import { BRAND_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"
import {
  MEMBER_BASE_PATH,
  MEMBER_ONBOARDING_PATH,
  MEMBER_OVERVIEW_PATH,
} from "@/lib/routes"

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
    const formData = new FormData()
    Object.entries(values).forEach(([key, val]) => {
      if (val !== undefined) {
        formData.append(key, val.toString())
      }
    })
    const result = await completeOnboarding(formData)
    if ("success" in result) {
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
    } else {
      toast.error(result.error)
    }
  }

  const canSubmit = Boolean(roleIntent && heardFrom)
  const isBusy = isSubmitting || isNavigating

  return (
    <main
      className={cn(
        "relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 py-6 font-sans text-[#0b1c30] md:px-6",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(90deg,rgba(0,81,213,0.055)_1px,transparent_1px),linear-gradient(180deg,rgba(0,81,213,0.055)_1px,transparent_1px)] before:bg-[size:48px_48px]",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(248,249,255,0.68))]",
      )}
    >
      <section className="relative z-10 w-full max-w-[640px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
        <header className="border-b border-[#E2E8F0] bg-white px-6 py-6 md:px-8">
          <div className="mb-4 flex items-center gap-3">
            <BrandLogo width={32} height={32} sizes="32px" eager />
            <span className="text-lg font-semibold tracking-normal text-[#00162a]">
              {BRAND_NAME}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-[#0b1c30]">
            {firstName ? `Welcome, ${firstName}` : "Set up your workspace"}
          </h1>
          <p className="mt-2 max-w-[520px] text-sm leading-5 text-[#43474c]">
            Let&apos;s customize your discovery experience to help you find
            high-performance tools.
          </p>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-10 px-6 py-6 md:px-8"
        >
          <fieldset>
            <legend className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#43474c]">
              What brings you here?
            </legend>
            <input type="hidden" {...register("roleIntent")} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {roleIntentOptions.map(({ value, label, icon: Icon }) => {
                const active = roleIntent === value

                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    className={cn(
                      "flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-lg border p-5 text-center transition-all hover:-translate-y-0.5 hover:border-[#c4c6cd] hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5]/30 focus-visible:ring-offset-2",
                      active
                        ? "border-[#0051d5] bg-[#EFF6FF] text-[#0b1c30]"
                        : "border-[#E2E8F0] bg-white text-[#0b1c30]",
                    )}
                    onClick={() =>
                      setValue("roleIntent", value, { shouldValidate: true })
                    }
                  >
                    <Icon className="mb-3 size-7 text-[#00162a]" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-[0.08em]">
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
            {errors.roleIntent ? (
              <p className="mt-3 text-sm font-medium text-[#ba1a1a]">
                {errors.roleIntent.message}
              </p>
            ) : null}
          </fieldset>

          <fieldset>
            <legend className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#43474c]">
              How did you find us?
            </legend>
            <input type="hidden" {...register("heardFrom")} />
            <div className="flex flex-wrap gap-2">
              {heardFromOptions.map(({ value, label, icon: Icon }) => {
                const active = heardFrom === value

                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5]/30 focus-visible:ring-offset-2",
                      active
                        ? "border-[#00162a] bg-[#00162a] text-white"
                        : "border-[#E2E8F0] bg-white text-[#43474c] hover:bg-[#F8FAFC] hover:text-[#0b1c30]",
                    )}
                    onClick={() =>
                      setValue("heardFrom", value, { shouldValidate: true })
                    }
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </button>
                )
              })}
            </div>
            {errors.heardFrom ? (
              <p className="mt-3 text-sm font-medium text-[#ba1a1a]">
                {errors.heardFrom.message}
              </p>
            ) : null}
          </fieldset>

          <footer className="pt-2">
            <button
              type="submit"
              className="flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#00162a] px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_22px_rgba(0,22,42,0.12)] transition-all hover:bg-[#213145] active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isBusy || !canSubmit}
            >
              {isBusy ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" aria-hidden />
                  Finalizing...
                </>
              ) : (
                "Finish setup"
              )}
            </button>
          </footer>
        </form>
      </section>
    </main>
  )
}
