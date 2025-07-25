import { z } from "zod"

export const NewsletterScalarFieldEnumSchema = z.enum([
  "id",
  "email",
  "createdAt",
])
