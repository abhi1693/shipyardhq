import { AdminObjectPageSkeleton } from "@/components/templates/admin/shared/object-page.skeleton"

export default function Loading() {
  return (
    <AdminObjectPageSkeleton
      overviewRows={8}
      sidebarSections={2}
      relationshipSections={2}
      relationshipColumns={4}
      relationshipRows={4}
      actionCount={0}
    />
  )
}
