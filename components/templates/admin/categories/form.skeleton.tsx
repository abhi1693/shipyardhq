import {
  AdminFormCardSkeleton,
  type AdminFormFieldSkeleton,
} from "@/components/templates/admin/shared/form-card.skeleton"

const fields: AdminFormFieldSkeleton[] = [
  { type: "input" },
  { type: "input" },
  { type: "select" },
]

export function AdminCategoryAddFormSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="md"
      fields={fields}
      actions={1}
      columns={1}
      showLegend
    />
  )
}

export function AdminCategoryEditFormSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="md"
      fields={fields}
      actions={1}
      columns={1}
      showLegend
    />
  )
}
