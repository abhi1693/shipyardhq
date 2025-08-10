"use client";

import { Button } from "@/components/atoms/button";

export default function WizardFooter({
  isReview,
  onBack,
  onNext,
  onSaveDraft,
  onPublish,
  disableBack,
  isSubmitting,
}: {
  isReview: boolean;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  disableBack?: boolean;
  isSubmitting?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <Button
        type="button"
        variant="secondary"
        onClick={onBack}
        disabled={disableBack || !!isSubmitting}
      >
        Back
      </Button>
      {isReview ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!!isSubmitting}
            onClick={onSaveDraft}
          >
            Save as Draft
          </Button>
          <Button type="button" disabled={!!isSubmitting} onClick={onPublish}>
            Publish
          </Button>
        </div>
      ) : (
        <Button type="button" onClick={onNext} disabled={!!isSubmitting}>
          Next
        </Button>
      )}
    </div>
  );
}

