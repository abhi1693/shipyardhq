"use client"

import { Button } from "@/components/atoms/button"

export type WizardSmartNextAction = { label: string; onClick: () => void }

export default function ProductWizardFooter({
  formId,
  isSubmitting,
  smartNextAction,
  onSaveDraft,
  publishLabel = "Publish",
  publishingLabel = "Publishing…",
}: {
  formId: string
  isSubmitting: boolean
  smartNextAction: WizardSmartNextAction | null
  onSaveDraft: () => void
  publishLabel?: string
  publishingLabel?: string
}) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {smartNextAction ? (
        <div
          role="button"
          tabIndex={isSubmitting ? -1 : 0}
          aria-disabled={isSubmitting}
          onClick={() => {
            if (isSubmitting) return
            smartNextAction.onClick()
          }}
          onKeyDown={(e) => {
            if (isSubmitting) return
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              smartNextAction.onClick()
            }
          }}
          className="group w-fit select-none text-left text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:rounded focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <span className="text-muted-foreground">Tip:</span>{" "}
          <span className="cursor-pointer underline-offset-4 group-hover:underline">
            {smartNextAction.label}
          </span>
        </div>
      ) : (
        <span />
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="border-slate-300 text-slate-700"
          disabled={isSubmitting}
          onClick={onSaveDraft}
        >
          Save draft
        </Button>
        <Button type="submit" form={formId} disabled={isSubmitting}>
          {isSubmitting ? publishingLabel : publishLabel}
        </Button>
      </div>
    </div>
  )
}

