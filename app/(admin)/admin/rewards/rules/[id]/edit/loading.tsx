import { AdminFormCardSkeleton } from "@/components/templates/admin/shared/form-card.skeleton"

export default function Loading() {
  return (
    <AdminFormCardSkeleton
      maxWidth="xl"
      fields={[
        { type: "input" },
        { type: "input" },
        { type: "select" },
        { type: "input" },
        { type: "input" },
        { type: "input" },
        { type: "textarea" },
        { type: "textarea" },
        { type: "input" },
        { type: "checkbox" },
      ]}
      actions={1}
      columns={2}
      showLegend
    />
  )
}
