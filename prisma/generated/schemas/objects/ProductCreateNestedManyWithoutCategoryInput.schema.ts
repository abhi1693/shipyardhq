import { z } from "zod"
import { ProductCreateWithoutCategoryInputObjectSchema } from "./ProductCreateWithoutCategoryInput.schema"
import { ProductUncheckedCreateWithoutCategoryInputObjectSchema } from "./ProductUncheckedCreateWithoutCategoryInput.schema"
import { ProductCreateOrConnectWithoutCategoryInputObjectSchema } from "./ProductCreateOrConnectWithoutCategoryInput.schema"
import { ProductCreateManyCategoryInputEnvelopeObjectSchema } from "./ProductCreateManyCategoryInputEnvelope.schema"
import { ProductWhereUniqueInputObjectSchema } from "./ProductWhereUniqueInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    create: z
      .union([
        z.lazy(() => ProductCreateWithoutCategoryInputObjectSchema),
        z.lazy(() => ProductCreateWithoutCategoryInputObjectSchema).array(),
        z.lazy(() => ProductUncheckedCreateWithoutCategoryInputObjectSchema),
        z
          .lazy(() => ProductUncheckedCreateWithoutCategoryInputObjectSchema)
          .array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([
        z.lazy(() => ProductCreateOrConnectWithoutCategoryInputObjectSchema),
        z
          .lazy(() => ProductCreateOrConnectWithoutCategoryInputObjectSchema)
          .array(),
      ])
      .optional(),
    createMany: z
      .lazy(() => ProductCreateManyCategoryInputEnvelopeObjectSchema)
      .optional(),
    connect: z
      .union([
        z.lazy(() => ProductWhereUniqueInputObjectSchema),
        z.lazy(() => ProductWhereUniqueInputObjectSchema).array(),
      ])
      .optional(),
  })
  .strict()

export const ProductCreateNestedManyWithoutCategoryInputObjectSchema = Schema
