export { PRICING_FAQS } from "@/lib/founder/content"
import clsx from "clsx"

import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

import { getPublicPlans } from "@/actions/public/plans/actions"
import { PricingTable } from "@/components/organisms/PricingTable"

export async function PricingPlansList({
  disableSectionWrapper = false,
  showTypeToggle = false,
  cardVariant = "default",
}: {
  disableSectionWrapper?: boolean
  showTypeToggle?: boolean
  cardVariant?: "default" | "placement"
} = {}) {
  const plans = await getPublicPlans()
  return plans.length ? (
    <PricingTable
      plans={plans}
      disableSectionWrapper={disableSectionWrapper}
      showTypeToggle={showTypeToggle}
      cardVariant={cardVariant}
    />
  ) : null
}

export function PricingPlansSkeleton({
  withSectionWrapper = true,
}: { withSectionWrapper?: boolean } = {}) {
  const toggle = (
    <div className="flex justify-center">
      <Skeleton
        className="h-10 w-56 rounded-full"
        tone="muted"
        shimmer={false}
      />
    </div>
  )
  const grid = (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <PricingPlanSkeletonCard key={index} highlight={index === 1} />
      ))}
    </div>
  )
  const content = (
    <div className="space-y-4">
      {toggle}
      {grid}
    </div>
  )

  if (!withSectionWrapper) {
    return <div className="mx-auto max-w-6xl px-4 py-2">{content}</div>
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-4">{content}</div>
    </section>
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
