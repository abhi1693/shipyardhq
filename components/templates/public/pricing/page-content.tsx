import { IconFlag3, IconSparkles, IconTargetArrow } from "@tabler/icons-react"
import clsx from "clsx"

import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

import { getPublicPlans } from "@/actions/public/plans/actions"
import { getProducts } from "@/actions/public/products/featured"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"
import { SubscriptionPlanCard } from "@/components/molecules/SubscriptionPlanCard"
import { PricingTable } from "@/components/organisms/PricingTable"
import { PlanType } from "@/lib/vendor/prisma/client"

export const CORE_PERKS = [
  {
    icon: IconFlag3,
    title: "Launch-ready guidance",
    body: "Preflight checklists, asset templates, and launch-day reminders keep every release on track.",
  },
  {
    icon: IconTargetArrow,
    title: "Flexible exposure",
    body: "Dial in the reach you need—from free listings to sponsored placements—with instant plan upgrades.",
  },
  {
    icon: IconSparkles,
    title: "Insights built in",
    body: "Automated research pipelines surface competitor intel, community chatter, and recommended plays—starting with a weekly run on the free plan and more credits as you upgrade.",
  },
]

export const PRICING_FAQS = [
  {
    question: "Can I start for free and upgrade later?",
    answer:
      "Absolutely. Every maker can list for free. Upgrade any product for extra reach—featured badges, sponsored placements, newsletter spots—whenever you need a boost.",
  },
  {
    question: "Which plans include Shipyard Insights?",
    answer:
      "Every plan includes Insights. Free listings get one run per week, while paid placements and organization subscriptions add more credits so you can refresh findings whenever you need.",
  },
  {
    question: "Do plans renew automatically?",
    answer:
      "Plans are purchased per launch window. When a term ends you decide whether to re-up. No surprise auto-renewals—just opt in when you’re ready for the next campaign.",
  },
  {
    question: "What level of support is included?",
    answer:
      "All plans include launch guidance, template assets, and async support from our team. Premium placements add one-on-one review sessions and priority feature requests.",
  },
  {
    question: "Can my team collaborate on launches?",
    answer:
      "Team access unlocks on plans that include organizations. Add your team, assign roles, and manage launches together from a shared dashboard.",
  },
]

export async function PricingPlansList({
  disableSectionWrapper = false,
}: { disableSectionWrapper?: boolean } = {}) {
  const plans = await getPublicPlans({ type: PlanType.one_time_price })
  return (
    <PricingTable plans={plans} disableSectionWrapper={disableSectionWrapper} />
  )
}

export async function SubscriptionPlansList() {
  const subscriptionPlans = await getPublicPlans({
    type: PlanType.recurring_price,
  })

  if (!subscriptionPlans.length) {
    return null
  }

  return (
    <div className="mt-10 mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-5 lg:gap-6">
      {subscriptionPlans.map((plan) => (
        <div
          key={plan.id}
          className="flex w-full max-w-sm flex-1 basis-full sm:basis-[20rem]"
        >
          <SubscriptionPlanCard plan={plan} />
        </div>
      ))}
    </div>
  )
}

export async function FeaturedProductsList() {
  const featured = await getProducts("featured")

  if (!featured.length) {
    return null
  }

  return <FeaturedProductGrid items={featured.slice(0, 6)} />
}

export function PricingPlansSkeleton({
  withSectionWrapper = true,
}: { withSectionWrapper?: boolean } = {}) {
  const grid = (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <PricingPlanSkeletonCard key={index} highlight={index === 1} />
      ))}
    </div>
  )

  if (!withSectionWrapper) {
    return <div className="mx-auto max-w-6xl px-4 py-2">{grid}</div>
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-4">{grid}</div>
    </section>
  )
}

export function SubscriptionPlansSkeleton() {
  return (
    <div className="mt-10 mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-5 lg:gap-6">
      {[...Array(2).keys()].map((index) => (
        <div
          key={index}
          className="h-72 w-full max-w-sm flex-1 basis-full animate-pulse rounded-3xl border border-[color:var(--brand-1)/0.15] bg-background/80 sm:basis-[20rem]"
        />
      ))}
    </div>
  )
}

export function FeaturedProductsSkeleton() {
  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3).keys()].map((index) => (
        <div
          key={index}
          className="aspect-[3/2] animate-pulse rounded-[24px] border border-[color:var(--brand-1)/0.15] bg-background/80"
        />
      ))}
    </div>
  )
}

function PricingPlanSkeletonCard({ highlight }: { highlight?: boolean }) {
  return (
    <Skeleton
      tone="soft"
      radius="lg"
      border="subtle"
      className={clsx(
        "flex h-full min-h-[34rem] flex-col gap-6 border bg-background/95 p-6 shadow-[0px_22px_55px_-38px_rgba(7,58,104,0.6)] backdrop-blur",
        highlight &&
          "border-[color:var(--brand-2)/0.22] shadow-[0px_28px_65px_-30px_rgba(7,78,134,0.32)] dark:border-[color:var(--brand-2)/0.28] dark:shadow-[0px_28px_60px_-30px_rgba(56,189,248,0.28)]",
        !highlight && "border-[color:var(--brand-1)/0.14]",
      )}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton
              className="h-3 w-32 rounded-full"
              tone="muted"
              shimmer={false}
            />
            <Skeleton
              className="h-3 w-48 rounded-full"
              tone="muted"
              shimmer={false}
            />
          </div>
          {highlight ? (
            <BadgeSkeleton
              variant="default"
              labelWidth="5.75rem"
              leadingIcon
              className="h-7"
              shimmer={false}
            />
          ) : (
            <BadgeSkeleton
              variant="outline"
              labelWidth="4.5rem"
              className="h-7"
              shimmer={false}
            />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <Skeleton
              className="h-3 w-16 rounded-full"
              tone="muted"
              shimmer={false}
            />
            <Skeleton
              className="h-10 w-32 rounded-full"
              tone="brand"
              border="subtle"
            />
            <Skeleton
              className="h-3 w-24 rounded-full"
              tone="muted"
              shimmer={false}
            />
          </div>
          <Skeleton
            className="h-2.5 w-32 rounded-full"
            tone="muted"
            shimmer={false}
          />
          <div className="flex items-center gap-2">
            <Skeleton
              className="size-5 rounded-full"
              tone="brand"
              border="subtle"
              shimmer={false}
            />
            <Skeleton
              className="h-2.5 w-48 rounded-full"
              tone="muted"
              shimmer={false}
            />
          </div>
          <Skeleton
            className="h-2 w-24 rounded-full"
            tone="muted"
            shimmer={false}
          />
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            tone="soft"
            radius="md"
            border="muted"
            shimmer={false}
            className="flex items-start gap-3 p-3"
          >
            <Skeleton
              className="mt-1 size-5 flex-none rounded-full"
              tone="brand"
              border="subtle"
              shimmer={false}
            />
            <div className="flex-1 space-y-2">
              <Skeleton
                className={clsx(
                  "h-2.5 rounded-full",
                  index % 2 === 0 ? "w-3/4" : "w-2/3",
                )}
                tone="muted"
                shimmer={false}
              />
              <Skeleton
                className="h-2 w-4/5 rounded-full"
                tone="muted"
                shimmer={false}
              />
            </div>
          </Skeleton>
        ))}
      </div>

      <div className="mt-4">
        <ButtonSkeleton
          size="lg"
          variant={highlight ? "default" : "outline"}
          className="w-full"
          labelWidth="9rem"
          shimmer={false}
        />
      </div>
    </Skeleton>
  )
}
