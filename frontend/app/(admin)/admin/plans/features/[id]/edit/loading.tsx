import { AdminFormCardSkeleton } from "@/components/templates/admin/shared/form-card.skeleton"

export default function Loading() {
  return (
    <AdminFormCardSkeleton
      maxWidth="lg"
      fields={[{ type: "select" }, { type: "input" }, { type: "input" }]}
      actions={1}
      columns={1}
      showLegend
    />
  )
}
