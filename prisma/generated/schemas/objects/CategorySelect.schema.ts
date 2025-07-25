import { z } from "zod"
import { ProductFindManySchema } from "../findManyProduct.schema"
import { CategoryCountOutputTypeArgsObjectSchema } from "./CategoryCountOutputTypeArgs.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: z.boolean().optional(),
    name: z.boolean().optional(),
    slug: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
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

export const CategorySelectObjectSchema = Schema
