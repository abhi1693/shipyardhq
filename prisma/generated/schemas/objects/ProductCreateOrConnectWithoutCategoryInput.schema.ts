import { z } from "zod"
import { ProductWhereUniqueInputObjectSchema } from "./ProductWhereUniqueInput.schema"
import { ProductCreateWithoutCategoryInputObjectSchema } from "./ProductCreateWithoutCategoryInput.schema"
import { ProductUncheckedCreateWithoutCategoryInputObjectSchema } from "./ProductUncheckedCreateWithoutCategoryInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    where: z.lazy(() => ProductWhereUniqueInputObjectSchema),
    create: z.union([
      z.lazy(() => ProductCreateWithoutCategoryInputObjectSchema),
      z.lazy(() => ProductUncheckedCreateWithoutCategoryInputObjectSchema),
    ]),
  })
  .strict()

export const ProductCreateOrConnectWithoutCategoryInputObjectSchema = Schema
