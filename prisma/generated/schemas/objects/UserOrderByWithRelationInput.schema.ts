import { z } from "zod"
import { SortOrderSchema } from "../enums/SortOrder.schema"
import { ProductOrderByRelationAggregateInputObjectSchema } from "./ProductOrderByRelationAggregateInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<Prisma.UserOrderByWithRelationInput> = z
  .object({
    id: SortOrderSchema.optional(),
    clerkId: SortOrderSchema.optional(),
    email: SortOrderSchema.optional(),
    firstName: SortOrderSchema.optional(),
    lastName: SortOrderSchema.optional(),
    role: SortOrderSchema.optional(),
    createdAt: SortOrderSchema.optional(),
    updatedAt: SortOrderSchema.optional(),
    products: z
      .lazy(() => ProductOrderByRelationAggregateInputObjectSchema)
      .optional(),
  })
  .strict()

export const UserOrderByWithRelationInputObjectSchema = Schema
