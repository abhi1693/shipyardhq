import { z } from "zod"
import { ProductCreateNestedManyWithoutCategoryInputObjectSchema } from "./ProductCreateNestedManyWithoutCategoryInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    slug: z.string(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    products: z
      .lazy(() => ProductCreateNestedManyWithoutCategoryInputObjectSchema)
      .optional(),
  })
  .strict()

export const CategoryCreateInputObjectSchema = Schema
