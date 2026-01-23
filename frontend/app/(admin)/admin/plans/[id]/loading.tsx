import { AdminObjectPageSkeleton } from "@/components/templates/admin/shared/object-page.skeleton"

export default function Loading() {
  return (
    <AdminObjectPageSkeleton
      overviewRows={8}
      sidebarSections={1}
      relationshipSections={1}
      relationshipColumns={4}
      relationshipRows={6}
      actionCount={2}
    />
  )
}
