import { z } from "zod"
import { SortOrderSchema } from "../enums/SortOrder.schema"
import { SortOrderInputObjectSchema } from "./SortOrderInput.schema"
import { UserOrderByWithRelationInputObjectSchema } from "./UserOrderByWithRelationInput.schema"
import { CategoryOrderByWithRelationInputObjectSchema } from "./CategoryOrderByWithRelationInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<Prisma.ProductOrderByWithRelationInput> = z
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
    user: z.lazy(() => UserOrderByWithRelationInputObjectSchema).optional(),
    category: z
      .lazy(() => CategoryOrderByWithRelationInputObjectSchema)
      .optional(),
  })
  .strict()

export const ProductOrderByWithRelationInputObjectSchema = Schema
