import { AdminObjectPageSkeleton } from "@/components/templates/admin/shared/object-page.skeleton"

export default function Loading() {
  return (
    <AdminObjectPageSkeleton
      overviewRows={5}
      sidebarSections={0}
      relationshipSections={0}
      actionCount={2}
    />
  )
}
