import { z } from "zod"
import { SortOrderSchema } from "../enums/SortOrder.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: SortOrderSchema.optional(),
    name: SortOrderSchema.optional(),
    slug: SortOrderSchema.optional(),
    createdAt: SortOrderSchema.optional(),
    updatedAt: SortOrderSchema.optional(),
  })
  .strict()

export const CategoryCountOrderByAggregateInputObjectSchema = Schema
