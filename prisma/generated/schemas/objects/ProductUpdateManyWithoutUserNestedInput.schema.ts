import { z } from "zod"
import { ProductCreateWithoutUserInputObjectSchema } from "./ProductCreateWithoutUserInput.schema"
import { ProductUncheckedCreateWithoutUserInputObjectSchema } from "./ProductUncheckedCreateWithoutUserInput.schema"
import { ProductCreateOrConnectWithoutUserInputObjectSchema } from "./ProductCreateOrConnectWithoutUserInput.schema"
import { ProductUpsertWithWhereUniqueWithoutUserInputObjectSchema } from "./ProductUpsertWithWhereUniqueWithoutUserInput.schema"
import { ProductCreateManyUserInputEnvelopeObjectSchema } from "./ProductCreateManyUserInputEnvelope.schema"
import { ProductWhereUniqueInputObjectSchema } from "./ProductWhereUniqueInput.schema"
import { ProductUpdateWithWhereUniqueWithoutUserInputObjectSchema } from "./ProductUpdateWithWhereUniqueWithoutUserInput.schema"
import { ProductUpdateManyWithWhereWithoutUserInputObjectSchema } from "./ProductUpdateManyWithWhereWithoutUserInput.schema"
import { ProductScalarWhereInputObjectSchema } from "./ProductScalarWhereInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    create: z
      .union([
        z.lazy(() => ProductCreateWithoutUserInputObjectSchema),
        z.lazy(() => ProductCreateWithoutUserInputObjectSchema).array(),
        z.lazy(() => ProductUncheckedCreateWithoutUserInputObjectSchema),
        z
          .lazy(() => ProductUncheckedCreateWithoutUserInputObjectSchema)
          .array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([
        z.lazy(() => ProductCreateOrConnectWithoutUserInputObjectSchema),
        z
          .lazy(() => ProductCreateOrConnectWithoutUserInputObjectSchema)
          .array(),
      ])
      .optional(),
    upsert: z
      .union([
        z.lazy(() => ProductUpsertWithWhereUniqueWithoutUserInputObjectSchema),
        z
          .lazy(() => ProductUpsertWithWhereUniqueWithoutUserInputObjectSchema)
          .array(),
      ])
      .optional(),
    createMany: z
      .lazy(() => ProductCreateManyUserInputEnvelopeObjectSchema)
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
        z.lazy(() => ProductUpdateWithWhereUniqueWithoutUserInputObjectSchema),
        z
          .lazy(() => ProductUpdateWithWhereUniqueWithoutUserInputObjectSchema)
          .array(),
      ])
      .optional(),
    updateMany: z
      .union([
        z.lazy(() => ProductUpdateManyWithWhereWithoutUserInputObjectSchema),
        z
          .lazy(() => ProductUpdateManyWithWhereWithoutUserInputObjectSchema)
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

export const ProductUpdateManyWithoutUserNestedInputObjectSchema = Schema
