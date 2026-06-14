import { ConfirmationCardSkeleton } from "@/components/molecules/ConfirmationCard.skeleton"

export function DeleteProductPageSkeleton() {
  return (
    <div className="py-8">
      <ConfirmationCardSkeleton descriptionLines={2} />
    </div>
  )
}
