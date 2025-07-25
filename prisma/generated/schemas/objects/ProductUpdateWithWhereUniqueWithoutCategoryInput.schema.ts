import { z } from "zod"
import { ProductWhereUniqueInputObjectSchema } from "./ProductWhereUniqueInput.schema"
import { ProductUpdateWithoutCategoryInputObjectSchema } from "./ProductUpdateWithoutCategoryInput.schema"
import { ProductUncheckedUpdateWithoutCategoryInputObjectSchema } from "./ProductUncheckedUpdateWithoutCategoryInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    where: z.lazy(() => ProductWhereUniqueInputObjectSchema),
    data: z.union([
      z.lazy(() => ProductUpdateWithoutCategoryInputObjectSchema),
      z.lazy(() => ProductUncheckedUpdateWithoutCategoryInputObjectSchema),
    ]),
  })
  .strict()

export const ProductUpdateWithWhereUniqueWithoutCategoryInputObjectSchema =
  Schema
