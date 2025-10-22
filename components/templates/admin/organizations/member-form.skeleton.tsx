import {
  AdminFormCardSkeleton,
  type AdminFormFieldSkeleton,
} from "@/components/templates/admin/shared/form-card.skeleton"

const memberFields: AdminFormFieldSkeleton[] = [
  { type: "select" },
  { type: "input", helper: true },
]

export function AdminOrganizationMemberAddFormSkeleton() {
  return (
    <AdminFormCardSkeleton
      maxWidth="md"
      fields={memberFields}
      actions={1}
      columns={1}
      showLegend
    />
  )
}
