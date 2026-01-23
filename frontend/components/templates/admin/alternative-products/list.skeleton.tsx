import { AdminListPageSkeleton } from "@/components/templates/admin/shared/list-page.skeleton"

export function AdminAlternativeProductListSkeleton() {
  return (
    <AdminListPageSkeleton
      titleLines={2}
      showAddButton
      filterCount={2}
      columnCount={6}
      rowCount={8}
    />
  )
}
