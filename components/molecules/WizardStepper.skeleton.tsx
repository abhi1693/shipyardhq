import { Skeleton } from "@/components/atoms/skeleton"

interface WizardStepperSkeletonProps {
  /**
   * Total number of steps to render placeholders for.
   */
  steps?: number
}

export function WizardStepperSkeleton({
  steps = 5,
}: WizardStepperSkeletonProps) {
  const safeSteps = Math.max(1, steps)

  return (
    <div
      className="space-y-4"
      data-slot="wizard-stepper-skeleton"
      aria-hidden="true"
    >
      <Skeleton className="h-1 w-full rounded-full" tone="muted" shimmer />
      <div className="flex items-center justify-between gap-2">
        {Array.from({ length: safeSteps }).map((_, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="size-8 rounded-full" tone="soft" shimmer />
            <Skeleton
              className="h-2 w-16 rounded-full"
              tone="muted"
              shimmer={false}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
