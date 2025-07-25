import { z } from "zod"
import { ProductFindManySchema } from "../findManyProduct.schema"
import { CategoryCountOutputTypeArgsObjectSchema } from "./CategoryCountOutputTypeArgs.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    products: z
      .union([z.boolean(), z.lazy(() => ProductFindManySchema)])
      .optional(),
    _count: z
      .union([
        z.boolean(),
        z.lazy(() => CategoryCountOutputTypeArgsObjectSchema),
      ])
      .optional(),
  })
  .strict()

export const CategoryIncludeObjectSchema = Schema
