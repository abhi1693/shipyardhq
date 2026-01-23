import { AdminObjectPageSkeleton } from "@/components/templates/admin/shared/object-page.skeleton"

export function AdminCategoryDetailSkeleton() {
  return (
    <AdminObjectPageSkeleton
      overviewRows={4}
      relationshipSections={2}
      relationshipColumns={4}
      relationshipRows={6}
      actionCount={2}
    />
  )
}
