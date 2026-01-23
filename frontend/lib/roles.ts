import { Role } from "@/types/globals"
import { auth } from "@clerk/nextjs/server"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

export const checkRole = async (role: Role) => {
  const { userId } = await auth()
  if (!userId) {
    return false
  }

  const user = await getActiveUserByClerkId(userId)
  if (!user) {
    return false
  }

  return user.role === role
}
