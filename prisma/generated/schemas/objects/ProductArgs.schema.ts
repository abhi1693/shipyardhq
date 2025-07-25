import { z } from "zod"
import { ProductSelectObjectSchema } from "./ProductSelect.schema"
import { ProductIncludeObjectSchema } from "./ProductInclude.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    select: z.lazy(() => ProductSelectObjectSchema).optional(),
    include: z.lazy(() => ProductIncludeObjectSchema).optional(),
  })
  .strict()

export const ProductArgsObjectSchema = Schema
