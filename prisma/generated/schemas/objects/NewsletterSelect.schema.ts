import { z } from "zod"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: z.boolean().optional(),
    email: z.boolean().optional(),
    createdAt: z.boolean().optional(),
  })
  .strict()

export const NewsletterSelectObjectSchema = Schema
