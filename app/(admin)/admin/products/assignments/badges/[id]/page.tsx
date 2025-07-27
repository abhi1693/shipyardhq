import { notFound } from "next/navigation"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { placeholder, formatDate, linkify } from "@/lib/ui/formatters"
import { Badge as UIBadge } from "@/components/atoms/badge"
import { getBadgeAssignmentById } from "@/actions/admin/badges/actions"

export default async function ViewProductBadgeAssignmentPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const assignment = await getBadgeAssignmentById(id)
  if (!assignment) return notFound()

  const { product, badge, expiresAt, createdAt, updatedAt } = assignment

  return (
    <ObjectPageLayout
      heading={{
        id: assignment.id,
        title: badge.name,
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
          value: (
            <UIBadge
              className={`bg-${badge.color}-100 text-${badge.color}-800`}
            >
              {badge.name}
            </UIBadge>
          ),
        },
        { label: "Badge Slug", value: badge.slug },
        { label: "Icon", value: badge.icon || placeholder() },
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
