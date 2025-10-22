import {
  AdminFormCardSkeleton,
  type AdminFormFieldSkeleton,
} from "@/components/templates/admin/shared/form-card.skeleton"

const useCaseFields: AdminFormFieldSkeleton[] = [{ type: "input" }]

export function AdminUseCaseAddFormSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="md"
      fields={useCaseFields}
      actions={1}
      columns={1}
      showLegend
    />
  )
}

export function AdminUseCaseEditFormSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="md"
      fields={useCaseFields}
      actions={1}
      columns={1}
      showLegend
    />
  )
}
