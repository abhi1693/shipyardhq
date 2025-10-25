import { ButtonSkeleton } from "@/components/atoms/button.skeleton"

interface WizardFooterSkeletonProps {
  /**
   * Control whether to render three action buttons (back + two primary actions).
   */
  actions?: number
}

export function WizardFooterSkeleton({
  actions = 2,
}: WizardFooterSkeletonProps) {
  const safeActions = Math.max(1, actions)

  return (
    <div
      className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between"
      data-slot="wizard-footer-skeleton"
      aria-hidden="true"
    >
      <ButtonSkeleton
        variant="ghost"
        size="sm"
        labelWidth="4.5rem"
        tone="soft"
      />
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: safeActions }).map((_, index) => (
          <ButtonSkeleton
            key={index}
            variant={index === safeActions - 1 ? "default" : "outline"}
            size="sm"
            labelWidth={index === safeActions - 1 ? "6.5rem" : "6rem"}
          />
        ))}
      </div>
    </div>
  )
}
