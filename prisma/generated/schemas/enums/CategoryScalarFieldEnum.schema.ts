import { z } from "zod"

export const CategoryScalarFieldEnumSchema = z.enum([
  "id",
  "name",
  "slug",
  "createdAt",
  "updatedAt",
])
