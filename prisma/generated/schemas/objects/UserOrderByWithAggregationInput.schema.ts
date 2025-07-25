import { z } from "zod"
import { SortOrderSchema } from "../enums/SortOrder.schema"
import { UserCountOrderByAggregateInputObjectSchema } from "./UserCountOrderByAggregateInput.schema"
import { UserMaxOrderByAggregateInputObjectSchema } from "./UserMaxOrderByAggregateInput.schema"
import { UserMinOrderByAggregateInputObjectSchema } from "./UserMinOrderByAggregateInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: SortOrderSchema.optional(),
    clerkId: SortOrderSchema.optional(),
    email: SortOrderSchema.optional(),
    firstName: SortOrderSchema.optional(),
    lastName: SortOrderSchema.optional(),
    role: SortOrderSchema.optional(),
    createdAt: SortOrderSchema.optional(),
    updatedAt: SortOrderSchema.optional(),
    _count: z.lazy(() => UserCountOrderByAggregateInputObjectSchema).optional(),
    _max: z.lazy(() => UserMaxOrderByAggregateInputObjectSchema).optional(),
    _min: z.lazy(() => UserMinOrderByAggregateInputObjectSchema).optional(),
  })
  .strict()

export const UserOrderByWithAggregationInputObjectSchema = Schema
