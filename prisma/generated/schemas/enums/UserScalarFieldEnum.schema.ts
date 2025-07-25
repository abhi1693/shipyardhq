import { z } from "zod"

export const UserScalarFieldEnumSchema = z.enum([
  "id",
  "clerkId",
  "email",
  "firstName",
  "lastName",
  "role",
  "createdAt",
  "updatedAt",
])
