import { z } from "zod"
import { SortOrderSchema } from "../enums/SortOrder.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<Prisma.NewsletterOrderByWithRelationInput> = z
  .object({
    id: SortOrderSchema.optional(),
    email: SortOrderSchema.optional(),
    createdAt: SortOrderSchema.optional(),
  })
  .strict()

export const NewsletterOrderByWithRelationInputObjectSchema = Schema
