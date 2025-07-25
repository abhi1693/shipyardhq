import { redirect } from "next/navigation"
import {deleteUserAction} from "@/actions/admin/users/actions";

export default async function DeleteUserPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const result = await deleteUserAction(id)

  if ("error" in result) {
    throw new Error(result.error)
  }

  redirect("/admin/users")
}
