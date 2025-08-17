"use client"

import { useParams, useRouter } from "next/navigation"
import {
  deleteMyOrganizationAction,
  getMyOrganizationById,
} from "@/actions/member/organizations/actions"
import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import DeleteButton from "@/components/molecules/DeleteButton"

export default function DeleteOrganizationPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [orgName, setOrgName] = useState<string>("")
  const [orgUrl, setOrgUrl] = useState<string>("")
  useEffect(() => {
    ;(async () => {
      if (!id) return
      const org = (await getMyOrganizationById(id as string)) as {
        name: string
        url: string
      } | null
      if (!org) return router.replace("/member/organizations")
      setOrgName(org.name)
      setOrgUrl(org.url)
    })()
  }, [id, router])

  async function onDelete() {
    const res = await deleteMyOrganizationAction(id as string)
    if ((res as any)?.error) return alert((res as any).error)
    router.push("/member/organizations")
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">
          Delete Organization
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            This will remove <span className="font-medium">{orgName}</span>
            {orgUrl ? (
              <>
                {" "}
                (<span className="font-mono text-foreground">{orgUrl}</span>)
              </>
            ) : null}{" "}
            and detach it from any products.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <DeleteButton label="Delete" onClick={onDelete} />
      </CardFooter>
    </Card>
  )
}
