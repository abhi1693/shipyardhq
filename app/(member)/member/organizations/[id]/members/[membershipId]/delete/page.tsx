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
  const { id, membershipId } = useParams<{ id: string; membershipId: string }>()
  const [memberEmail, setMemberEmail] = useState<string>("")
  useEffect(() => {
    ;(async () => {
      if (!id || !membershipId) return
      const rows = await getMyOrganizationMembers(id as string)
      const found = rows.find((r: any) => r.id === membershipId)
      if (!found)
        return router.replace(memberOrganizationMembersPath(id as string))
      setMemberEmail(found.user.email)
    })()
  }, [id, membershipId, router])

  async function onDelete() {
    const res = await deleteMyOrganizationMemberAction(membershipId as string)
    if ((res as any)?.error) return alert((res as any).error)
    router.push(memberOrganizationPath(id as string))
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
