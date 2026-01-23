import { AdminListPageSkeleton } from "@/components/templates/admin/shared/list-page.skeleton"

export default function Loading() {
  return (
    <AdminListPageSkeleton
      titleLines={2}
      showAddButton
      filterCount={0}
      columnCount={5}
      rowCount={10}
    />
  )
}
