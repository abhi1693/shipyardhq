import { z } from "zod"
import { CategoryWhereUniqueInputObjectSchema } from "./CategoryWhereUniqueInput.schema"
import { CategoryCreateWithoutProductsInputObjectSchema } from "./CategoryCreateWithoutProductsInput.schema"
import { CategoryUncheckedCreateWithoutProductsInputObjectSchema } from "./CategoryUncheckedCreateWithoutProductsInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    where: z.lazy(() => CategoryWhereUniqueInputObjectSchema),
    create: z.union([
      z.lazy(() => CategoryCreateWithoutProductsInputObjectSchema),
      z.lazy(() => CategoryUncheckedCreateWithoutProductsInputObjectSchema),
    ]),
  })
  .strict()

export const CategoryCreateOrConnectWithoutProductsInputObjectSchema = Schema
