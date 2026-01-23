import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ADMIN_OVERVIEW_PATH } from "@/lib/routes"

export default async function Admin() {
  const { userId } = await auth()

  if (!userId) {
    return redirect("/")
  } else {
    redirect(ADMIN_OVERVIEW_PATH)
  }
}
