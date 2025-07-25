import { z } from "zod"
import { CategoryWhereInputObjectSchema } from "./CategoryWhereInput.schema"
import { CategoryUpdateWithoutProductsInputObjectSchema } from "./CategoryUpdateWithoutProductsInput.schema"
import { CategoryUncheckedUpdateWithoutProductsInputObjectSchema } from "./CategoryUncheckedUpdateWithoutProductsInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    where: z.lazy(() => CategoryWhereInputObjectSchema).optional(),
    data: z.union([
      z.lazy(() => CategoryUpdateWithoutProductsInputObjectSchema),
      z.lazy(() => CategoryUncheckedUpdateWithoutProductsInputObjectSchema),
    ]),
  })
  .strict()

export const CategoryUpdateToOneWithWhereWithoutProductsInputObjectSchema =
  Schema
