import { z } from "zod"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<Prisma.NewsletterUncheckedCreateInput> = z
  .object({
    id: z.string().optional(),
    email: z.string(),
    createdAt: z.coerce.date().optional(),
  })
  .strict()

export const NewsletterUncheckedCreateInputObjectSchema = Schema
