import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function Admin() {
  const { userId } = await auth()

  if (!userId) {
    return redirect("/")
  } else {
    redirect("/admin/overview")
  }
}
