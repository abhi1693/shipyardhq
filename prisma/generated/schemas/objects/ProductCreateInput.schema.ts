import { z } from "zod"
import { UserCreateNestedOneWithoutProductsInputObjectSchema } from "./UserCreateNestedOneWithoutProductsInput.schema"
import { CategoryCreateNestedOneWithoutProductsInputObjectSchema } from "./CategoryCreateNestedOneWithoutProductsInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().optional().nullable(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    user: z.lazy(() => UserCreateNestedOneWithoutProductsInputObjectSchema),
    category: z.lazy(
      () => CategoryCreateNestedOneWithoutProductsInputObjectSchema,
    ),
  })
  .strict()

export const ProductCreateInputObjectSchema = Schema
