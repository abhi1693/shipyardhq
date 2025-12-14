"use client"

import dynamic from "next/dynamic"
import { ReactNode } from "react"
import { PLATFORMS } from "@/lib/productWizard/constants"

const Step1 = dynamic(
  () => import("@/app/(member)/member/products/shared/step1"),
)
const StepMedia = dynamic(
  () => import("@/app/(member)/member/products/shared/step2"),
)
const Step2 = dynamic(
  () => import("@/app/(member)/member/products/shared/step3"),
)
const Step3 = dynamic(
  () => import("@/app/(member)/member/products/shared/step4"),
)
const Step4 = dynamic(
  () => import("@/app/(member)/member/products/shared/step5"),
)

export function renderStep(
  step: number,
  args: {
    categories: { id: string; name: string; icon?: string | null }[]
    organizations: { id: string; name: string }[]
    alternatives?: {
      id: string
      slug?: string | null
      name: string
      websiteUrl?: string | null
    }[]
    productId?: string
    productSlug?: string
    galleryMedia?: { id: string; imageUrl: string }[]
    canEditGallery?: boolean
    maxGallery?: number
    persistOnVerify?: boolean
    lockWebsiteUrl?: boolean
    rightOfWebsite?: ReactNode
    enableAutofill?: boolean
    autofillNotice?: ReactNode
    pricingAside?: ReactNode
  },
) {
  switch (step) {
    case 1:
      return (
        <Step1
          categories={args.categories}
          platforms={PLATFORMS as any}
          lockWebsiteUrl={args.lockWebsiteUrl}
          rightOfWebsite={args.rightOfWebsite as any}
          enableAutofill={Boolean(args.enableAutofill)}
          autofillNotice={args.autofillNotice}
        />
      )
    case 2:
      return (
        <StepMedia
          productId={args.productId}
          productSlug={args.productSlug}
          galleryMedia={args.galleryMedia ?? []}
          canEditGallery={Boolean(args.canEditGallery)}
          maxGallery={args.maxGallery ?? 6}
        />
      )
    case 3:
      return (
        <Step2 rightOfPricing={args.pricingAside} />
      )
    case 4:
      return (
        <Step3
          productId={args.productId}
          persistOnVerify={Boolean(args.persistOnVerify)}
        />
      )
    case 5:
      return (
        <Step4
          organizations={args.organizations}
          alternatives={args.alternatives ?? []}
        />
      )
    default:
      return (
        <Step4
          organizations={args.organizations}
          alternatives={args.alternatives ?? []}
        />
      )
  }
}
