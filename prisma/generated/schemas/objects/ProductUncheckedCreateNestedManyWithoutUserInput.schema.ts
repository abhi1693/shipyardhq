import { z } from "zod"
import { ProductCreateWithoutUserInputObjectSchema } from "./ProductCreateWithoutUserInput.schema"
import { ProductUncheckedCreateWithoutUserInputObjectSchema } from "./ProductUncheckedCreateWithoutUserInput.schema"
import { ProductCreateOrConnectWithoutUserInputObjectSchema } from "./ProductCreateOrConnectWithoutUserInput.schema"
import { ProductCreateManyUserInputEnvelopeObjectSchema } from "./ProductCreateManyUserInputEnvelope.schema"
import { ProductWhereUniqueInputObjectSchema } from "./ProductWhereUniqueInput.schema"

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
    createMany: z
      .lazy(() => ProductCreateManyUserInputEnvelopeObjectSchema)
      .optional(),
    connect: z
      .union([
        z.lazy(() => ProductWhereUniqueInputObjectSchema),
        z.lazy(() => ProductWhereUniqueInputObjectSchema).array(),
      ])
      .optional(),
  })
  .strict()

export const ProductUncheckedCreateNestedManyWithoutUserInputObjectSchema =
  Schema
