import { z } from "zod"
import { CategoryUpdateWithoutProductsInputObjectSchema } from "./CategoryUpdateWithoutProductsInput.schema"
import { CategoryUncheckedUpdateWithoutProductsInputObjectSchema } from "./CategoryUncheckedUpdateWithoutProductsInput.schema"
import { CategoryCreateWithoutProductsInputObjectSchema } from "./CategoryCreateWithoutProductsInput.schema"
import { CategoryUncheckedCreateWithoutProductsInputObjectSchema } from "./CategoryUncheckedCreateWithoutProductsInput.schema"
import { CategoryWhereInputObjectSchema } from "./CategoryWhereInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    update: z.union([
      z.lazy(() => CategoryUpdateWithoutProductsInputObjectSchema),
      z.lazy(() => CategoryUncheckedUpdateWithoutProductsInputObjectSchema),
    ]),
    create: z.union([
      z.lazy(() => CategoryCreateWithoutProductsInputObjectSchema),
      z.lazy(() => CategoryUncheckedCreateWithoutProductsInputObjectSchema),
    ]),
    where: z.lazy(() => CategoryWhereInputObjectSchema).optional(),
  })
  .strict()

export const CategoryUpsertWithoutProductsInputObjectSchema = Schema
