"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useParams, useRouter } from "next/navigation"
import {
  getMyOrganizationById,
  getMyOrganizationMembers,
  updateOrganizationOwnerAction,
} from "@/actions/member/organizations/actions"
import { memberOrganizationPath } from "@/lib/routes"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import SaveButton from "@/components/molecules/SaveButton"
import { OrganizationMemberFormSkeleton } from "@/components/templates/member/organizations/OrganizationMemberForm.skeleton"

export default function ChangeOwnerPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const organizationId = params?.id
  const [members, setMembers] = useState<any[]>([])
  const [ownerId, setOwnerId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const form = useForm<{ owner: string }>({ defaultValues: { owner: "" } })

  useEffect(() => {
    let active = true

    ;(async () => {
      if (!organizationId) {
        if (active) setIsLoading(false)
        return
      }
      const org = (await getMyOrganizationById(organizationId)) as {
        ownerUserId: string | null
      } | null
      const rows = await getMyOrganizationMembers(organizationId)
      if (!active) return
      setMembers(rows)
      const nextOwnerId = org?.ownerUserId || ""
      setOwnerId(nextOwnerId)
      form.reset({ owner: nextOwnerId })
      setIsLoading(false)
    })()

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!organizationId) return
    const res = await updateOrganizationOwnerAction(organizationId, ownerId)
    if ((res as any)?.error) return alert((res as any).error)
    router.push(memberOrganizationPath(organizationId))
  }

  if (isLoading) {
    return <OrganizationMemberFormSkeleton actionLabelWidth="6.5rem" />
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">
          Change Owner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="owner"
              render={() => (
                <FormItem>
                  <FormLabel>New Owner</FormLabel>
                  <FormControl>
                    <Select value={ownerId} onValueChange={setOwnerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.user.id} value={m.user.id}>
                            {m.user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SaveButton type="submit">Save</SaveButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
