import { z } from "zod"
import { ProductScalarWhereInputObjectSchema } from "./ProductScalarWhereInput.schema"
import { ProductUpdateManyMutationInputObjectSchema } from "./ProductUpdateManyMutationInput.schema"
import { ProductUncheckedUpdateManyWithoutCategoryInputObjectSchema } from "./ProductUncheckedUpdateManyWithoutCategoryInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    where: z.lazy(() => ProductScalarWhereInputObjectSchema),
    data: z.union([
      z.lazy(() => ProductUpdateManyMutationInputObjectSchema),
      z.lazy(() => ProductUncheckedUpdateManyWithoutCategoryInputObjectSchema),
    ]),
  })
  .strict()

export const ProductUpdateManyWithWhereWithoutCategoryInputObjectSchema = Schema
