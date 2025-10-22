import { AdminListPageSkeleton } from "@/components/templates/admin/shared/list-page.skeleton"

export function AdminFeedbackListSkeleton() {
  return (
    <AdminListPageSkeleton
      titleLines={2}
      showAddButton={false}
      filterCount={4}
      columnCount={6}
      rowCount={10}
      withViewOptions={false}
    />
  )
}
