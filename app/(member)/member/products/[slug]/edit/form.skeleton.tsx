import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { FormSkeleton } from "@/components/atoms/form.skeleton"
import { WizardFooterSkeleton } from "@/components/molecules/WizardFooter.skeleton"
import { WizardStepperSkeleton } from "@/components/molecules/WizardStepper.skeleton"

export function EditProductFormSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6"
      data-slot="edit-product-form-skeleton"
      aria-hidden="true"
    >
      <div className="space-y-2">
        <HeadingSkeleton lines={1} />
        <Skeleton
          className="h-2.5 w-1/2 rounded-full"
          tone="muted"
          shimmer={false}
        />
      </div>

      <Skeleton
        tone="soft"
        radius="lg"
        border="muted"
        inset
        className="p-6 shadow-sm"
      >
        <div className="space-y-6">
          <WizardStepperSkeleton />

          <FormSkeleton
            columns={2}
            showTitle
            actions={0}
            fields={[
              { type: "input" },
              { type: "input" },
              { type: "textarea", columns: 2 },
              { type: "select" },
              { type: "select" },
            ]}
            className="border-dashed border-white/40 bg-white/95 shadow-none"
          />

          <WizardFooterSkeleton />
        </div>
      </Skeleton>
    </div>
  )
}
