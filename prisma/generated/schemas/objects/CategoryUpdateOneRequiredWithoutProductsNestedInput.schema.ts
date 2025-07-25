import { z } from "zod"
import { CategoryCreateWithoutProductsInputObjectSchema } from "./CategoryCreateWithoutProductsInput.schema"
import { CategoryUncheckedCreateWithoutProductsInputObjectSchema } from "./CategoryUncheckedCreateWithoutProductsInput.schema"
import { CategoryCreateOrConnectWithoutProductsInputObjectSchema } from "./CategoryCreateOrConnectWithoutProductsInput.schema"
import { CategoryUpsertWithoutProductsInputObjectSchema } from "./CategoryUpsertWithoutProductsInput.schema"
import { CategoryWhereUniqueInputObjectSchema } from "./CategoryWhereUniqueInput.schema"
import { CategoryUpdateToOneWithWhereWithoutProductsInputObjectSchema } from "./CategoryUpdateToOneWithWhereWithoutProductsInput.schema"
import { CategoryUpdateWithoutProductsInputObjectSchema } from "./CategoryUpdateWithoutProductsInput.schema"
import { CategoryUncheckedUpdateWithoutProductsInputObjectSchema } from "./CategoryUncheckedUpdateWithoutProductsInput.schema"

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
    upsert: z
      .lazy(() => CategoryUpsertWithoutProductsInputObjectSchema)
      .optional(),
    connect: z.lazy(() => CategoryWhereUniqueInputObjectSchema).optional(),
    update: z
      .union([
        z.lazy(
          () => CategoryUpdateToOneWithWhereWithoutProductsInputObjectSchema,
        ),
        z.lazy(() => CategoryUpdateWithoutProductsInputObjectSchema),
        z.lazy(() => CategoryUncheckedUpdateWithoutProductsInputObjectSchema),
      ])
      .optional(),
  })
  .strict()

export const CategoryUpdateOneRequiredWithoutProductsNestedInputObjectSchema =
  Schema
