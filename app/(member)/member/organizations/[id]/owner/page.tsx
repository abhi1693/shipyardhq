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

export default function ChangeOwnerPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [members, setMembers] = useState<any[]>([])
  const [ownerId, setOwnerId] = useState<string>("")
  const form = useForm<{ owner: string }>({ defaultValues: { owner: "" } })

  useEffect(() => {
    ;(async () => {
      if (!id) return
      const org = (await getMyOrganizationById(id as string)) as {
        ownerUserId: string | null
      } | null
      const rows = await getMyOrganizationMembers(id as string)
      setMembers(rows)
      setOwnerId(org?.ownerUserId || "")
    })()
  }, [id])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await updateOrganizationOwnerAction(id as string, ownerId)
    if ((res as any)?.error) return alert((res as any).error)
    router.push(memberOrganizationPath(id as string))
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
