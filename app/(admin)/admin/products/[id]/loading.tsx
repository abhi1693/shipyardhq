import { AdminObjectPageSkeleton } from "@/components/templates/admin/shared/object-page.skeleton"

export default function Loading() {
  return (
    <AdminObjectPageSkeleton
      overviewRows={12}
      sidebarSections={2}
      relationshipSections={3}
      relationshipColumns={4}
      relationshipRows={6}
      actionCount={5}
    />
  )
}
