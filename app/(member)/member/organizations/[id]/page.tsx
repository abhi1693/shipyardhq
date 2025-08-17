import Link from "next/link"
import { redirect } from "next/navigation"
import {
  getMyOrganizationById,
  getMyOrganizationMembers,
} from "@/actions/member/organizations/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { formatDistanceToNow } from "@/lib/ui/formatters"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { MemberOrganizationMembersRelationship } from "./relationships/members"

export default async function MemberOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const org = (await getMyOrganizationById(id)) as {
    id: string
    name: string
    url: string
    createdAt: Date
    updatedAt: Date | null
    ownerUserId?: string | null
  } | null
  if (!org) {
    redirect("/member/organizations")
  }

  // Determine if current user is the owner
  const { userId: clerkId } = await auth()
  let isOwner = false
  if (clerkId) {
    const me = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
    if (me && org.ownerUserId) {
      isOwner = org.ownerUserId === me.id
    }
  }
  const members = await getMyOrganizationMembers(id)

  const overview = [
    { label: "Domain", value: org.url },
    {
      label: "Created",
      value: formatDistanceToNow(new Date(org.createdAt)),
    },
    {
      label: "Updated",
      value: formatDistanceToNow(new Date(org.updatedAt as any)),
    },
  ]

  const heading = {
    id: org.id,
    title: org.name,
    createdAt: org.createdAt as any,
    updatedAt: (org.updatedAt as any) || (org.createdAt as any),
    slug: null as any,
  }

  const actionsLeft = isOwner ? (
    <div className="flex items-center gap-3">
      <Link
        href={`/member/organizations/${org.id}/owner`}
        className="text-sm text-primary hover:underline"
      >
        Change Owner
      </Link>
    </div>
  ) : null

  return (
    <ObjectPageLayout
      heading={heading}
      overview={overview}
      basePath="member/organizations"
      editable={isOwner}
      deletable={isOwner}
      headingActionsLeft={actionsLeft}
      relationships={
        <MemberOrganizationMembersRelationship
          rows={members as any}
          organizationId={org.id}
          canManage={isOwner}
        />
      }
    />
  )
}
