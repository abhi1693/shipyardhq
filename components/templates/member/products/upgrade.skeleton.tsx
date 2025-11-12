import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

function PricingCardSkeleton() {
  return (
    <Skeleton
      tone="soft"
      radius="lg"
      border="muted"
      inset
      className="flex h-full flex-col space-y-5 rounded-2xl border-[color:var(--brand-1)/0.15] bg-white/90 p-6 shadow-[0_22px_55px_-38px_rgba(7,58,104,0.45)]"
    >
      <div className="space-y-2">
        <Skeleton className="h-3 w-32 rounded-full" tone="muted" />
        <Skeleton className="h-4 w-40 rounded-full" tone="muted" />
      </div>
      <div className="space-y-3">
        <div className="flex items-baseline gap-3">
          <Skeleton className="h-8 w-20 rounded-lg" tone="muted" />
          <Skeleton className="h-3 w-20 rounded-full" tone="muted" />
        </div>
        <Skeleton className="h-8 w-44 rounded-full" tone="soft" />
      </div>
      <div className="flex-1 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" tone="soft" />
            <Skeleton className="h-3 flex-1 rounded-full" tone="muted" />
          </div>
        ))}
      </div>
      <ButtonSkeleton className="w-full" labelWidth="7rem" />
    </Skeleton>
  )
}

export function ProductUpgradePageSkeleton() {
  return (
    <div
      className="px-4 py-8 md:px-8"
      data-slot="member-product-upgrade-skeleton"
      aria-hidden="true"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 text-center">
        <HeadingSkeleton lines={1} centered />
      </div>

      <div className="mx-auto mt-10 w-full max-w-5xl">
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <PricingCardSkeleton key={index} />
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Skeleton className="h-3 w-48 rounded-full" tone="muted" />
      </div>
    </div>
  )
}
