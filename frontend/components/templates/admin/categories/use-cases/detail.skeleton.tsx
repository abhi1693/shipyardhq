import { AdminObjectPageSkeleton } from "@/components/templates/admin/shared/object-page.skeleton"

export function AdminUseCaseDetailSkeleton() {
  return (
    <AdminObjectPageSkeleton
      overviewRows={3}
      relationshipSections={1}
      relationshipColumns={4}
      relationshipRows={6}
      actionCount={2}
    />
  )
}
