import { notFound } from "next/navigation"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { formatDate, linkify } from "@/lib/ui/formatters"
import { getBadgeAssignmentById } from "@/actions/admin/badges/actions"

export default async function ViewProductBadgeAssignmentPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const assignment = await getBadgeAssignmentById(id)
  if (!assignment) return notFound()

  const { product, expiresAt, createdAt, updatedAt } = assignment

  return (
    <ObjectPageLayout
      heading={{
        id: assignment.id,
        title: assignment.badge,
        createdAt,
        updatedAt,
      }}
      overview={[
        {
          label: "Product",
          value: linkify({
            label: product.name,
            href: `/admin/products/${product.id}`,
          }),
        },
        {
          label: "Badge",
          value: assignment.badge,
        },
        {
          label: "Expires At",
          value: expiresAt ? formatDate(expiresAt) : "Never",
        },
      ]}
      basePath="admin/products/assignments/badges"
      deletable
    />
  )
}
