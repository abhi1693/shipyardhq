import { AdminFormCardSkeleton } from "@/components/templates/admin/shared/form-card.skeleton"

export default function Loading() {
  return (
    <AdminFormCardSkeleton
      maxWidth="lg"
      fields={[
        { type: "select" },
        { type: "select" },
        { type: "checkbox" },
        { type: "checkbox" },
        { type: "input" },
        { type: "select" },
      ]}
      actions={1}
      columns={2}
      showLegend
    />
  )
}
