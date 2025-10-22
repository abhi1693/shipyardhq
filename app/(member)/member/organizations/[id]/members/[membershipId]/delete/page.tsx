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
import { ConfirmationCardSkeleton } from "@/components/molecules/ConfirmationCard.skeleton"

export default function DeleteMemberPage() {
  const router = useRouter()
  const params = useParams<{ id: string; membershipId: string }>()
  const organizationId = params?.id
  const organizationMembershipId = params?.membershipId
  const [memberEmail, setMemberEmail] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    let active = true

    ;(async () => {
      if (!organizationId || !organizationMembershipId) {
        if (active) setIsLoading(false)
        return
      }

      const rows = await getMyOrganizationMembers(organizationId)
      const found = rows.find((r: any) => r.id === organizationMembershipId)
      if (!found) {
        if (active) setIsLoading(false)
        router.replace(memberOrganizationMembersPath(organizationId))
        return
      }

      if (!active) return
      setMemberEmail(found.user.email)
      setIsLoading(false)
    })()

    return () => {
      active = false
    }
  }, [organizationId, organizationMembershipId, router])

  async function onDelete() {
    if (!organizationId || !organizationMembershipId) return
    const res = await deleteMyOrganizationMemberAction(organizationMembershipId)
    if ((res as any)?.error) return alert((res as any).error)
    router.push(memberOrganizationPath(organizationId))
  }

  if (isLoading) {
    return <ConfirmationCardSkeleton />
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
