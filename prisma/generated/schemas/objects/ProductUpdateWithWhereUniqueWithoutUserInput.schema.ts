import { z } from "zod"
import { ProductWhereUniqueInputObjectSchema } from "./ProductWhereUniqueInput.schema"
import { ProductUpdateWithoutUserInputObjectSchema } from "./ProductUpdateWithoutUserInput.schema"
import { ProductUncheckedUpdateWithoutUserInputObjectSchema } from "./ProductUncheckedUpdateWithoutUserInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    where: z.lazy(() => ProductWhereUniqueInputObjectSchema),
    data: z.union([
      z.lazy(() => ProductUpdateWithoutUserInputObjectSchema),
      z.lazy(() => ProductUncheckedUpdateWithoutUserInputObjectSchema),
    ]),
  })
  .strict()

export const ProductUpdateWithWhereUniqueWithoutUserInputObjectSchema = Schema
