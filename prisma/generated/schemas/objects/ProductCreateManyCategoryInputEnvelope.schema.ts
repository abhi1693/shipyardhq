import { z } from "zod"
import { ProductCreateManyCategoryInputObjectSchema } from "./ProductCreateManyCategoryInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    data: z.union([
      z.lazy(() => ProductCreateManyCategoryInputObjectSchema),
      z.lazy(() => ProductCreateManyCategoryInputObjectSchema).array(),
    ]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict()

export const ProductCreateManyCategoryInputEnvelopeObjectSchema = Schema
