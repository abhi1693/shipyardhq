import { z } from "zod"
import { ProductCreateWithoutCategoryInputObjectSchema } from "./ProductCreateWithoutCategoryInput.schema"
import { ProductUncheckedCreateWithoutCategoryInputObjectSchema } from "./ProductUncheckedCreateWithoutCategoryInput.schema"
import { ProductCreateOrConnectWithoutCategoryInputObjectSchema } from "./ProductCreateOrConnectWithoutCategoryInput.schema"
import { ProductUpsertWithWhereUniqueWithoutCategoryInputObjectSchema } from "./ProductUpsertWithWhereUniqueWithoutCategoryInput.schema"
import { ProductCreateManyCategoryInputEnvelopeObjectSchema } from "./ProductCreateManyCategoryInputEnvelope.schema"
import { ProductWhereUniqueInputObjectSchema } from "./ProductWhereUniqueInput.schema"
import { ProductUpdateWithWhereUniqueWithoutCategoryInputObjectSchema } from "./ProductUpdateWithWhereUniqueWithoutCategoryInput.schema"
import { ProductUpdateManyWithWhereWithoutCategoryInputObjectSchema } from "./ProductUpdateManyWithWhereWithoutCategoryInput.schema"
import { ProductScalarWhereInputObjectSchema } from "./ProductScalarWhereInput.schema"

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
    upsert: z
      .union([
        z.lazy(
          () => ProductUpsertWithWhereUniqueWithoutCategoryInputObjectSchema,
        ),
        z
          .lazy(
            () => ProductUpsertWithWhereUniqueWithoutCategoryInputObjectSchema,
          )
          .array(),
      ])
      .optional(),
    createMany: z
      .lazy(() => ProductCreateManyCategoryInputEnvelopeObjectSchema)
      .optional(),
    set: z
      .union([
        z.lazy(() => ProductWhereUniqueInputObjectSchema),
        z.lazy(() => ProductWhereUniqueInputObjectSchema).array(),
      ])
      .optional(),
    disconnect: z
      .union([
        z.lazy(() => ProductWhereUniqueInputObjectSchema),
        z.lazy(() => ProductWhereUniqueInputObjectSchema).array(),
      ])
      .optional(),
    delete: z
      .union([
        z.lazy(() => ProductWhereUniqueInputObjectSchema),
        z.lazy(() => ProductWhereUniqueInputObjectSchema).array(),
      ])
      .optional(),
    connect: z
      .union([
        z.lazy(() => ProductWhereUniqueInputObjectSchema),
        z.lazy(() => ProductWhereUniqueInputObjectSchema).array(),
      ])
      .optional(),
    update: z
      .union([
        z.lazy(
          () => ProductUpdateWithWhereUniqueWithoutCategoryInputObjectSchema,
        ),
        z
          .lazy(
            () => ProductUpdateWithWhereUniqueWithoutCategoryInputObjectSchema,
          )
          .array(),
      ])
      .optional(),
    updateMany: z
      .union([
        z.lazy(
          () => ProductUpdateManyWithWhereWithoutCategoryInputObjectSchema,
        ),
        z
          .lazy(
            () => ProductUpdateManyWithWhereWithoutCategoryInputObjectSchema,
          )
          .array(),
      ])
      .optional(),
    deleteMany: z
      .union([
        z.lazy(() => ProductScalarWhereInputObjectSchema),
        z.lazy(() => ProductScalarWhereInputObjectSchema).array(),
      ])
      .optional(),
  })
  .strict()

export const ProductUpdateManyWithoutCategoryNestedInputObjectSchema = Schema
