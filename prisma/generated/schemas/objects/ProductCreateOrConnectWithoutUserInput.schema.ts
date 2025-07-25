import { z } from "zod"
import { ProductWhereUniqueInputObjectSchema } from "./ProductWhereUniqueInput.schema"
import { ProductCreateWithoutUserInputObjectSchema } from "./ProductCreateWithoutUserInput.schema"
import { ProductUncheckedCreateWithoutUserInputObjectSchema } from "./ProductUncheckedCreateWithoutUserInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    where: z.lazy(() => ProductWhereUniqueInputObjectSchema),
    create: z.union([
      z.lazy(() => ProductCreateWithoutUserInputObjectSchema),
      z.lazy(() => ProductUncheckedCreateWithoutUserInputObjectSchema),
    ]),
  })
  .strict()

export const ProductCreateOrConnectWithoutUserInputObjectSchema = Schema
