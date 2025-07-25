import { z } from "zod"
import { CategoryCreateWithoutProductsInputObjectSchema } from "./CategoryCreateWithoutProductsInput.schema"
import { CategoryUncheckedCreateWithoutProductsInputObjectSchema } from "./CategoryUncheckedCreateWithoutProductsInput.schema"
import { CategoryCreateOrConnectWithoutProductsInputObjectSchema } from "./CategoryCreateOrConnectWithoutProductsInput.schema"
import { CategoryWhereUniqueInputObjectSchema } from "./CategoryWhereUniqueInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    create: z
      .union([
        z.lazy(() => CategoryCreateWithoutProductsInputObjectSchema),
        z.lazy(() => CategoryUncheckedCreateWithoutProductsInputObjectSchema),
      ])
      .optional(),
    connectOrCreate: z
      .lazy(() => CategoryCreateOrConnectWithoutProductsInputObjectSchema)
      .optional(),
    connect: z.lazy(() => CategoryWhereUniqueInputObjectSchema).optional(),
  })
  .strict()

export const CategoryCreateNestedOneWithoutProductsInputObjectSchema = Schema
