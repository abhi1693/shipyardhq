import {
  AdminFormCardSkeleton,
  type AdminFormFieldSkeleton,
} from "@/components/templates/admin/shared/form-card.skeleton"

const fields: AdminFormFieldSkeleton[] = [{ type: "select" }, { type: "select" }]

export function AdminUseCaseAssignmentAddFormSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="lg"
      fields={fields}
      actions={1}
      columns={2}
      showLegend
    />
  )
}

export function AdminUseCaseAssignmentEditFormSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="lg"
      fields={fields}
      actions={1}
      columns={2}
      showLegend
    />
  )
}
