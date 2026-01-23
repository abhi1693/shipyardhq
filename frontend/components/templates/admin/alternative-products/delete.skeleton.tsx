import { AdminFormCardSkeleton } from "@/components/templates/admin/shared/form-card.skeleton"

export function AdminAlternativeProductDeleteSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="md"
      fields={[{ type: "input" }]}
      actions={2}
      columns={1}
    />
  )
}
