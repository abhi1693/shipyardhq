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

// Options
const roleIntentOptions = [
  { label: "Launch a product", value: "launch-product" },
  { label: "Manage a team", value: "manage-team" },
  { label: "Just exploring", value: "explore" },
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

// Schema
const onboardingSchema = z.object({
  roleIntent: z.string().min(1, "Please select your intent"),
  heardFrom: z.string().min(1, "Please select an option"),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms",
  }),
})

type OnboardingFormInput = z.infer<typeof onboardingSchema>

export function OnboardingForm({ firstName }: { firstName?: string | null }) {
  const router = useRouter()

  const form = useForm<OnboardingFormInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      roleIntent: "",
      heardFrom: "",
      acceptedTerms: false,
    },
  })

  const {
    handleSubmit,
    register,
    setValue,
    formState: { errors },
    watch,
  } = form

  const onSubmit = async (values: OnboardingFormInput) => {
    const formData = new FormData()
    Object.entries(values).forEach(([key, val]) => {
      if (val !== undefined) formData.append(key, val.toString())
    })

    const result = await completeOnboarding(formData)
    if ("success" in result) {
      toast.success("Welcome aboard!")
      router.push("/member/overview")
    } else {
      toast.error(result.error)
    }
  }

  const sel = {
    roleIntent: form.watch("roleIntent"),
    heardFrom: form.watch("heardFrom"),
    acceptedTerms: form.watch("acceptedTerms"),
  }

  const canSubmit = Boolean(
    sel.roleIntent && sel.heardFrom && sel.acceptedTerms,
  )

  return (
    <Card className="w-full max-w-2xl border shadow-sm">
      <CardHeader className="text-center space-y-1">
        <CardTitle className="text-2xl font-semibold">
          Welcome, {firstName ?? "User"} 👋
        </CardTitle>
        <CardDescription>
          Let&#39;s personalize your experience and get you started quickly.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>Why are you here?</Label>
            <input type="hidden" {...register("roleIntent")} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {roleIntentOptions.map((opt) => {
                const active = sel.roleIntent === opt.value
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={active ? "default" : "outline"}
                    onClick={() =>
                      setValue("roleIntent", opt.value, {
                        shouldValidate: true,
                      })
                    }
                  >
                    {opt.label}
                  </Button>
                )
              })}
            </div>
            {errors.roleIntent && (
              <p className="text-sm text-red-600">
                {errors.roleIntent.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Where did you hear about us?</Label>
            <input type="hidden" {...register("heardFrom")} />
            <div className="flex flex-wrap gap-2">
              {heardFromOptions.map((opt) => {
                const active = sel.heardFrom === opt.value
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() =>
                      setValue("heardFrom", opt.value, { shouldValidate: true })
                    }
                  >
                    {opt.label}
                  </Button>
                )
              })}
            </div>
            {errors.heardFrom && (
              <p className="text-sm text-red-600">{errors.heardFrom.message}</p>
            )}
          </div>

          <Separator />

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="terms"
              checked={watch("acceptedTerms")}
              onCheckedChange={(checked: boolean) =>
                setValue("acceptedTerms", checked, { shouldValidate: true })
              }
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed">
              I agree to the terms and conditions
            </Label>
          </div>
          {errors.acceptedTerms && (
            <p className="text-sm text-red-600">
              {errors.acceptedTerms.message}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-4 mt-4">
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting || !canSubmit}
          >
            {form.formState.isSubmitting
              ? "Submitting..."
              : "Complete Onboarding"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
