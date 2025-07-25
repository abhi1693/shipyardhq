import { z } from "zod"
import { ProductCreateManyUserInputObjectSchema } from "./ProductCreateManyUserInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    data: z.union([
      z.lazy(() => ProductCreateManyUserInputObjectSchema),
      z.lazy(() => ProductCreateManyUserInputObjectSchema).array(),
    ]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict()

export const ProductCreateManyUserInputEnvelopeObjectSchema = Schema
