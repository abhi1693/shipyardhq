import { AdminListPageSkeleton } from "@/components/templates/admin/shared/list-page.skeleton"

export default function Loading() {
  return (
    <AdminListPageSkeleton
      titleLines={2}
      showAddButton={false}
      filterCount={5}
      columnCount={6}
      rowCount={12}
      withViewOptions={false}
    />
  )
}
