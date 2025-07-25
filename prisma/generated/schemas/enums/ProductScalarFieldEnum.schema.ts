import { z } from "zod"

export const ProductScalarFieldEnumSchema = z.enum([
  "id",
  "name",
  "description",
  "userId",
  "categoryId",
  "createdAt",
  "updatedAt",
])
