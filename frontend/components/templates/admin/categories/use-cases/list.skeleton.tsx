import { AdminListPageSkeleton } from "@/components/templates/admin/shared/list-page.skeleton"

export function AdminUseCasesListSkeleton() {
  return (
    <AdminListPageSkeleton
      titleLines={2}
      showAddButton
      filterCount={1}
      columnCount={4}
      rowCount={8}
    />
  )
}
