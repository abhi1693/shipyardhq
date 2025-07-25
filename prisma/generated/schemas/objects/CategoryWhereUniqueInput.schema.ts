import { z } from "zod"
import { CategoryWhereInputObjectSchema } from "./CategoryWhereInput.schema"
import { DateTimeFilterObjectSchema } from "./DateTimeFilter.schema"
import { ProductListRelationFilterObjectSchema } from "./ProductListRelationFilter.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<Prisma.CategoryWhereUniqueInput> = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    AND: z
      .union([
        z.lazy(() => CategoryWhereInputObjectSchema),
        z.lazy(() => CategoryWhereInputObjectSchema).array(),
      ])
      .optional(),
    OR: z
      .lazy(() => CategoryWhereInputObjectSchema)
      .array()
      .optional(),
    NOT: z
      .union([
        z.lazy(() => CategoryWhereInputObjectSchema),
        z.lazy(() => CategoryWhereInputObjectSchema).array(),
      ])
      .optional(),
    createdAt: z
      .union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()])
      .optional(),
    updatedAt: z
      .union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()])
      .optional(),
    products: z.lazy(() => ProductListRelationFilterObjectSchema).optional(),
  })
  .strict()

export const CategoryWhereUniqueInputObjectSchema = Schema
