import { AdminObjectPageSkeleton } from "@/components/templates/admin/shared/object-page.skeleton"

export function AdminOrganizationDetailSkeleton() {
  return (
    <AdminObjectPageSkeleton
      overviewRows={5}
      relationshipSections={1}
      relationshipColumns={4}
      relationshipRows={6}
      actionCount={2}
    />
  )
}
