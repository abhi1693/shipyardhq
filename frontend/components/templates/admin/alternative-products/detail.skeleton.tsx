import { AdminObjectPageSkeleton } from "@/components/templates/admin/shared/object-page.skeleton"

export function AdminAlternativeProductDetailSkeleton() {
  return (
    <AdminObjectPageSkeleton
      overviewRows={6}
      relationshipSections={2}
      relationshipColumns={4}
      relationshipRows={6}
      actionCount={2}
      showSlug={false}
    />
  )
}
