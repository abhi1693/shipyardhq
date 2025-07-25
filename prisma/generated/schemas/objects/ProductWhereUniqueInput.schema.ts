import { z } from "zod"
import { ProductWhereInputObjectSchema } from "./ProductWhereInput.schema"
import { StringFilterObjectSchema } from "./StringFilter.schema"
import { StringNullableFilterObjectSchema } from "./StringNullableFilter.schema"
import { DateTimeFilterObjectSchema } from "./DateTimeFilter.schema"
import { UserScalarRelationFilterObjectSchema } from "./UserScalarRelationFilter.schema"
import { UserWhereInputObjectSchema } from "./UserWhereInput.schema"
import { CategoryScalarRelationFilterObjectSchema } from "./CategoryScalarRelationFilter.schema"
import { CategoryWhereInputObjectSchema } from "./CategoryWhereInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<Prisma.ProductWhereUniqueInput> = z
  .object({
    id: z.string(),
    AND: z
      .union([
        z.lazy(() => ProductWhereInputObjectSchema),
        z.lazy(() => ProductWhereInputObjectSchema).array(),
      ])
      .optional(),
    OR: z
      .lazy(() => ProductWhereInputObjectSchema)
      .array()
      .optional(),
    NOT: z
      .union([
        z.lazy(() => ProductWhereInputObjectSchema),
        z.lazy(() => ProductWhereInputObjectSchema).array(),
      ])
      .optional(),
    name: z
      .union([z.lazy(() => StringFilterObjectSchema), z.string()])
      .optional(),
    description: z
      .union([z.lazy(() => StringNullableFilterObjectSchema), z.string()])
      .optional()
      .nullable(),
    userId: z
      .union([z.lazy(() => StringFilterObjectSchema), z.string()])
      .optional(),
    categoryId: z
      .union([z.lazy(() => StringFilterObjectSchema), z.string()])
      .optional(),
    createdAt: z
      .union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()])
      .optional(),
    updatedAt: z
      .union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()])
      .optional(),
    user: z
      .union([
        z.lazy(() => UserScalarRelationFilterObjectSchema),
        z.lazy(() => UserWhereInputObjectSchema),
      ])
      .optional(),
    category: z
      .union([
        z.lazy(() => CategoryScalarRelationFilterObjectSchema),
        z.lazy(() => CategoryWhereInputObjectSchema),
      ])
      .optional(),
  })
  .strict()

export const ProductWhereUniqueInputObjectSchema = Schema
