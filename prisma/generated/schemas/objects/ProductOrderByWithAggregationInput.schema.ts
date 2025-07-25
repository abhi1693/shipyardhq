import { z } from "zod"
import { SortOrderSchema } from "../enums/SortOrder.schema"
import { SortOrderInputObjectSchema } from "./SortOrderInput.schema"
import { ProductCountOrderByAggregateInputObjectSchema } from "./ProductCountOrderByAggregateInput.schema"
import { ProductMaxOrderByAggregateInputObjectSchema } from "./ProductMaxOrderByAggregateInput.schema"
import { ProductMinOrderByAggregateInputObjectSchema } from "./ProductMinOrderByAggregateInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: SortOrderSchema.optional(),
    name: SortOrderSchema.optional(),
    description: z
      .union([SortOrderSchema, z.lazy(() => SortOrderInputObjectSchema)])
      .optional(),
    userId: SortOrderSchema.optional(),
    categoryId: SortOrderSchema.optional(),
    createdAt: SortOrderSchema.optional(),
    updatedAt: SortOrderSchema.optional(),
    _count: z
      .lazy(() => ProductCountOrderByAggregateInputObjectSchema)
      .optional(),
    _max: z.lazy(() => ProductMaxOrderByAggregateInputObjectSchema).optional(),
    _min: z.lazy(() => ProductMinOrderByAggregateInputObjectSchema).optional(),
  })
  .strict()

export const ProductOrderByWithAggregationInputObjectSchema = Schema
