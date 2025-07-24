import { Role } from "@/types/globals"
import { auth } from "@clerk/nextjs/server"

export const checkRole = async (role: Role) => {
  const { sessionClaims } = await auth()
  return sessionClaims?.metadata.role === role
}
