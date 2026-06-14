import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

function PlanOptionSkeleton({ selected = false }: { selected?: boolean }) {
  return (
    <div
      className={[
        "rounded-2xl border p-6",
        selected
          ? "border-[#00162a] bg-[#00162a]"
          : "border-[#E2E8F0] bg-white",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <Skeleton
            className="h-4 w-36 rounded-full"
            tone={selected ? "muted" : "soft"}
          />
          <Skeleton
            className="h-7 w-48 max-w-full rounded-lg"
            tone={selected ? "muted" : "soft"}
          />
          <Skeleton
            className="h-3 w-24 rounded-full"
            tone={selected ? "muted" : "muted"}
          />
        </div>
        <div className="shrink-0 space-y-2 text-right">
          <Skeleton
            className="h-6 w-20 rounded-full"
            tone={selected ? "muted" : "soft"}
          />
          <Skeleton className="h-3 w-24 rounded-full" tone="muted" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 text-sm md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-full" tone="soft" />
            <Skeleton className="h-4 flex-1 rounded-full" tone="muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

function PerformancePanelSkeleton() {
  return (
    <aside className="w-full xl:w-[380px]">
      <div className="sticky top-24 rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
        <Skeleton className="mx-auto mb-8 h-3 w-44 rounded-full" tone="muted" />
        <div className="relative mb-8 flex justify-center">
          <Skeleton className="size-48 rounded-full" tone="soft" />
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
            <Skeleton className="h-12 w-24 rounded-lg" tone="muted" />
            <Skeleton className="h-3 w-28 rounded-full" tone="muted" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex items-end justify-between px-1">
            <Skeleton className="h-3 w-32 rounded-full" tone="muted" />
            <Skeleton className="h-6 w-20 rounded-full" tone="soft" />
          </div>
          <ButtonSkeleton
            className="h-12 w-full rounded-xl"
            labelWidth="5rem"
          />
          <div className="space-y-2">
            <Skeleton
              className="mx-auto h-3 w-full rounded-full"
              tone="muted"
            />
            <Skeleton className="mx-auto h-3 w-4/5 rounded-full" tone="muted" />
          </div>
        </div>
      </div>
    </aside>
  )
}

export function ProductUpgradePageSkeleton() {
  return (
    <div
      className="px-4 py-8 md:px-8"
      data-slot="member-product-upgrade-skeleton"
      aria-hidden="true"
    >
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-10 w-80 max-w-full rounded-lg" tone="soft" />
            <Skeleton
              className="h-5 w-[34rem] max-w-full rounded-full"
              tone="muted"
            />
          </div>
          <div className="flex rounded-xl border border-[#E2E8F0] bg-white p-1">
            <Skeleton className="h-10 w-36 rounded-lg" tone="soft" />
            <Skeleton className="h-10 w-44 rounded-lg" tone="muted" />
          </div>
        </div>

        <div className="flex flex-col gap-8 xl:flex-row">
          <section className="min-w-0 flex-1 space-y-4">
            <PlanOptionSkeleton />
            <PlanOptionSkeleton selected />
            <PlanOptionSkeleton />
          </section>
          <PerformancePanelSkeleton />
        </div>
      </div>
    </div>
  )
}
