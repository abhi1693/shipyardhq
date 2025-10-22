import { AdminFormCardSkeleton } from "@/components/templates/admin/shared/form-card.skeleton"

export default function Loading() {
  return (
    <AdminFormCardSkeleton
      maxWidth="md"
      fields={[{ type: "input" }]}
      actions={1}
      columns={1}
      showLegend
    />
  )
}
