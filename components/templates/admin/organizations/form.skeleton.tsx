import {
  AdminFormCardSkeleton,
  type AdminFormFieldSkeleton,
} from "@/components/templates/admin/shared/form-card.skeleton"

const fields: AdminFormFieldSkeleton[] = [{ type: "input" }, { type: "input" }]

export function AdminOrganizationAddFormSkeleton() {
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

export function AdminOrganizationEditFormSkeleton() {
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
