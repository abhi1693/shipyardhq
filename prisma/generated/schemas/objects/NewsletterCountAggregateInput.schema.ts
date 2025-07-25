import { z } from "zod"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: z.literal(true).optional(),
    email: z.literal(true).optional(),
    createdAt: z.literal(true).optional(),
    _all: z.literal(true).optional(),
  })
  .strict()

export const NewsletterCountAggregateInputObjectSchema = Schema
