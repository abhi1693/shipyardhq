import { z } from "zod"
import { ProductWhereInputObjectSchema } from "./ProductWhereInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    every: z.lazy(() => ProductWhereInputObjectSchema).optional(),
    some: z.lazy(() => ProductWhereInputObjectSchema).optional(),
    none: z.lazy(() => ProductWhereInputObjectSchema).optional(),
  })
  .strict()

export const ProductListRelationFilterObjectSchema = Schema
