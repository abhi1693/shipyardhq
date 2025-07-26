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
import { Input } from "@/components/atoms/input"
import { Label } from "@/components/atoms/label"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/atoms/select"
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
  productInterest: z.string().optional(),
  heardFrom: z.string().min(1, "Please select an option"),
  jobTitle: z.string().optional(),
  organizationName: z.string().optional(),
  organizationUrl: z.url("Invalid URL format").or(z.literal("")).optional(),
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
      productInterest: "",
      heardFrom: "",
      jobTitle: "",
      organizationName: "",
      organizationUrl: "",
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
      router.push("/member/dashboard")
    } else {
      toast.error(result.error)
    }
  }

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
            <Label htmlFor="roleIntent">Why are you here?</Label>
            <Select
              name="roleIntent"
              onValueChange={(val) => setValue("roleIntent", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your intent" />
              </SelectTrigger>
              <SelectContent>
                {roleIntentOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleIntent && (
              <p className="text-sm text-red-600">
                {errors.roleIntent.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="productInterest">What are you interested in?</Label>
            <Input
              {...register("productInterest")}
              placeholder="e.g. Discover, upload, manage"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="heardFrom">Where did you hear about us?</Label>
            <Select
              name="heardFrom"
              onValueChange={(val) => setValue("heardFrom", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a source" />
              </SelectTrigger>
              <SelectContent>
                {heardFromOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.heardFrom && (
              <p className="text-sm text-red-600">{errors.heardFrom.message}</p>
            )}
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="jobTitle">Your job title (optional)</Label>
            <Input
              {...register("jobTitle")}
              placeholder="e.g. Product Manager, CTO"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="organizationName">
                Organization name (optional)
              </Label>
              <Input
                {...register("organizationName")}
                placeholder="e.g. Acme Inc."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="organizationUrl">
                Organization website (optional)
              </Label>
              <Input
                type="url"
                {...register("organizationUrl")}
                placeholder="https://yourcompany.com"
              />
              {errors.organizationUrl && (
                <p className="text-sm text-red-600">
                  {errors.organizationUrl.message}
                </p>
              )}
            </div>
          </div>

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
            disabled={form.formState.isSubmitting}
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
