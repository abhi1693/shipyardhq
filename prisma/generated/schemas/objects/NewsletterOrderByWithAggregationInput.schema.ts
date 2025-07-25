import { z } from "zod"
import { SortOrderSchema } from "../enums/SortOrder.schema"
import { NewsletterCountOrderByAggregateInputObjectSchema } from "./NewsletterCountOrderByAggregateInput.schema"
import { NewsletterMaxOrderByAggregateInputObjectSchema } from "./NewsletterMaxOrderByAggregateInput.schema"
import { NewsletterMinOrderByAggregateInputObjectSchema } from "./NewsletterMinOrderByAggregateInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: SortOrderSchema.optional(),
    email: SortOrderSchema.optional(),
    createdAt: SortOrderSchema.optional(),
    _count: z
      .lazy(() => NewsletterCountOrderByAggregateInputObjectSchema)
      .optional(),
    _max: z
      .lazy(() => NewsletterMaxOrderByAggregateInputObjectSchema)
      .optional(),
    _min: z
      .lazy(() => NewsletterMinOrderByAggregateInputObjectSchema)
      .optional(),
  })
  .strict()

export const NewsletterOrderByWithAggregationInputObjectSchema = Schema
