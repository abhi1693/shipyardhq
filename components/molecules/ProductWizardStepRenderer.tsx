"use client"

import dynamic from "next/dynamic"
import { ReactNode } from "react"
import { PLATFORMS } from "@/lib/productWizard/constants"

const Step1 = dynamic(
  () => import("@/app/(member)/member/products/shared/step1"),
)
const Step2 = dynamic(
  () => import("@/app/(member)/member/products/shared/step2"),
)
const Step3 = dynamic(
  () => import("@/app/(member)/member/products/shared/step3"),
)
const Step4 = dynamic(
  () => import("@/app/(member)/member/products/shared/step4"),
)
const Review = dynamic(
  () => import("@/app/(member)/member/products/shared/review"),
)

export function renderStep(
  step: number,
  args: {
    categories: { id: string; name: string }[]
    organizations: { id: string; name: string }[]
    alternatives?: {
      id: string
      slug?: string | null
      name: string
      websiteUrl?: string | null
    }[]
    productId?: string
    persistOnVerify?: boolean
    lockWebsiteUrl?: boolean
    canEditCTA?: boolean
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
          productId={args.productId}
          lockWebsiteUrl={args.lockWebsiteUrl}
          rightOfWebsite={args.rightOfWebsite as any}
          enableAutofill={Boolean(args.enableAutofill)}
          autofillNotice={args.autofillNotice}
        />
      )
    case 2:
      return <Step2 rightOfPricing={args.pricingAside} />
    case 3:
      return (
        <Step3
          productId={args.productId}
          persistOnVerify={Boolean(args.persistOnVerify)}
        />
      )
    case 4:
      return (
        <Step4
          organizations={args.organizations}
          productId={args.productId}
          canEditCTA={args.canEditCTA}
          alternatives={args.alternatives ?? []}
        />
      )
    case 5:
    default:
      return (
        <Review
          categories={args.categories}
          organizations={args.organizations}
          alternatives={args.alternatives ?? []}
        />
      )
  }
}
