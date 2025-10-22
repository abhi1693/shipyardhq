import {
  AdminFormCardSkeleton,
  type AdminFormFieldSkeleton,
} from "@/components/templates/admin/shared/form-card.skeleton"

const baseFields: AdminFormFieldSkeleton[] = [
  { type: "input" },
  { type: "input" },
  { type: "input" },
  { type: "input" },
  { type: "select" },
]

export function AdminUserAddFormSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="md"
      fields={baseFields}
      actions={1}
      columns={1}
      showLegend
    />
  )
}

export function AdminUserEditFormSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="md"
      fields={baseFields.slice(1)}
      actions={1}
      columns={1}
      showLegend
    />
  )
}
