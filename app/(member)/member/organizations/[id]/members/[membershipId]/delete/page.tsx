"use client"

import { useParams, useRouter } from "next/navigation"
import {
  deleteMyOrganizationMemberAction,
  getMyOrganizationMembers,
} from "@/actions/member/organizations/actions"
import {
  memberOrganizationMembersPath,
  memberOrganizationPath,
} from "@/lib/routes"
import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import DeleteButton from "@/components/molecules/DeleteButton"

export default function DeleteMemberPage() {
  const router = useRouter()
  const params = useParams<{ id: string; membershipId: string }>()
  const organizationId = params?.id
  const organizationMembershipId = params?.membershipId
  const [memberEmail, setMemberEmail] = useState<string>("")
  useEffect(() => {
    ;(async () => {
      if (!organizationId || !organizationMembershipId) return
      const rows = await getMyOrganizationMembers(organizationId)
      const found = rows.find((r: any) => r.id === organizationMembershipId)
      if (!found)
        return router.replace(memberOrganizationMembersPath(organizationId))
      setMemberEmail(found.user.email)
    })()
  }, [organizationId, organizationMembershipId, router])

  async function onDelete() {
    if (!organizationId || !organizationMembershipId) return
    const res = await deleteMyOrganizationMemberAction(organizationMembershipId)
    if ((res as any)?.error) return alert((res as any).error)
    router.push(memberOrganizationPath(organizationId))
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">
          Remove Member
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This will remove {memberEmail} from this organization.
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <DeleteButton onClick={onDelete} />
      </CardFooter>
    </Card>
  )
}
