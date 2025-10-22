import { AdminObjectPageSkeleton } from "@/components/templates/admin/shared/object-page.skeleton"

export function AdminUserDetailSkeleton() {
  return (
    <AdminObjectPageSkeleton
      overviewRows={10}
      relationshipSections={7}
      relationshipColumns={5}
      relationshipRows={5}
      actionCount={3}
    />
  )
}
