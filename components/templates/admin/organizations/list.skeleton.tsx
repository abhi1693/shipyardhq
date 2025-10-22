import { AdminListPageSkeleton } from "@/components/templates/admin/shared/list-page.skeleton"

export function AdminOrganizationsListSkeleton() {
  return (
    <AdminListPageSkeleton
      titleLines={2}
      showAddButton
      filterCount={2}
      columnCount={5}
      rowCount={8}
    />
  )
}
