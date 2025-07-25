import { z } from "zod"
import { SortOrderSchema } from "../enums/SortOrder.schema"
import { ProductOrderByRelationAggregateInputObjectSchema } from "./ProductOrderByRelationAggregateInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<Prisma.CategoryOrderByWithRelationInput> = z
  .object({
    id: SortOrderSchema.optional(),
    name: SortOrderSchema.optional(),
    slug: SortOrderSchema.optional(),
    createdAt: SortOrderSchema.optional(),
    updatedAt: SortOrderSchema.optional(),
    products: z
      .lazy(() => ProductOrderByRelationAggregateInputObjectSchema)
      .optional(),
  })
  .strict()

export const CategoryOrderByWithRelationInputObjectSchema = Schema
