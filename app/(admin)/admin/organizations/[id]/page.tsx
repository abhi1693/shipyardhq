import { notFound } from "next/navigation"
import { getOrganizationById } from "@/actions/admin/organizations/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { linkify, formatDate } from "@/lib/ui/formatters"
import { OrganizationMembersRelationship } from "./relationships/members"

export default async function ViewOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const org = await getOrganizationById(id, {
    include: {
      memberships: {
        include: { user: true },
      },
    },
  })
  if (!org) return notFound()

  return (
    <ObjectPageLayout
      heading={{
        id: org.id,
        title: org.name,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      }}
      overview={[
        { label: "Name", value: org.name },
        {
          label: "URL",
          value: linkify({ href: org.url, label: org.url, isExternal: true }),
        },
        { label: "Members", value: String(org.memberships?.length ?? 0) },
        { label: "Created", value: formatDate(org.createdAt) },
        { label: "Updated", value: formatDate(org.updatedAt) },
      ]}
      basePath="admin/organizations"
      deletable
      editable
      relationships={
        <OrganizationMembersRelationship
          rows={org.memberships as any}
          organizationId={org.id}
        />
      }
    />
  )
}
