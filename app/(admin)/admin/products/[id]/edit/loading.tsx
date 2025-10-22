import { Skeleton } from "@/components/atoms/skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { FormSkeleton } from "@/components/atoms/form.skeleton"
import { WizardStepperSkeleton } from "@/components/molecules/WizardStepper.skeleton"
import { WizardFooterSkeleton } from "@/components/molecules/WizardFooter.skeleton"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6" aria-hidden="true">
      <Skeleton
        tone="soft"
        radius="lg"
        shimmer={false}
        inset
        className="space-y-6 border border-white/25 p-6"
      >
        <HeadingSkeleton lines={1} />
        <WizardStepperSkeleton />
        <FormSkeleton
          fields={Array.from({ length: 6 }, (_, index) =>
            index % 3 === 0 ? { type: "input" } : index % 3 === 1 ? { type: "select" } : { type: "textarea" },
          )}
          actions={0}
          columns={2}
          className="border border-white/20 bg-white/95"
        />
        <WizardFooterSkeleton />
      </Skeleton>
    </div>
  )
}
