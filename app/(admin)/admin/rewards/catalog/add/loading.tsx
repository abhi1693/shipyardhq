import { AdminFormCardSkeleton } from "@/components/templates/admin/shared/form-card.skeleton"

export default function Loading() {
  return (
    <AdminFormCardSkeleton
      maxWidth="xl"
      fields={[
        { type: "input" },
        { type: "select" },
        { type: "select" },
        { type: "textarea" },
        { type: "input" },
        { type: "input" },
        { type: "input" },
        { type: "checkbox" },
        { type: "checkbox" },
        { type: "textarea" },
      ]}
      actions={1}
      columns={2}
      showLegend
    />
  )
}
