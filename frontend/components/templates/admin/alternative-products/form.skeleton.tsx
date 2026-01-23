import {
  AdminFormCardSkeleton,
  type AdminFormFieldSkeleton,
} from "@/components/templates/admin/shared/form-card.skeleton"

const fields: AdminFormFieldSkeleton[] = [
  { type: "input" },
  { type: "textarea" },
  { type: "input" },
  { type: "input" },
  { type: "checkbox", columns: 2 },
  { type: "checkbox", columns: 2 },
]

export function AdminAlternativeProductFormSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="xl"
      fields={fields}
      actions={1}
      columns={1}
      showLegend
    />
  )
}

export function AdminAlternativeProductEditFormSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="xl"
      fields={fields}
      actions={1}
      columns={1}
      showLegend
    />
  )
}
