"use client"

import { Button } from "@/components/atoms/button"

export default function WizardFooter({
  isReview,
  onBack,
  onNext,
  onSaveDraft,
  onPublish,
  disableBack,
  isSubmitting,
}: {
  isReview: boolean
  onBack: () => void
  onNext: () => void
  onSaveDraft: () => void
  onPublish: () => void
  disableBack?: boolean
  isSubmitting?: boolean
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-slate-200/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="ghost"
        className="justify-center text-slate-600 hover:bg-slate-100"
        onClick={onBack}
        disabled={disableBack || !!isSubmitting}
      >
        Back
      </Button>

      {isReview ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-slate-300 text-slate-700"
            disabled={!!isSubmitting}
            onClick={onSaveDraft}
          >
            Save draft
          </Button>
          <Button
            type="button"
            disabled={!!isSubmitting}
            onClick={onPublish}
          >
            Publish
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-slate-300 text-slate-700"
            disabled={!!isSubmitting}
            onClick={onSaveDraft}
          >
            Save draft
          </Button>
          <Button
            type="button"
            onClick={onNext}
            disabled={!!isSubmitting}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
