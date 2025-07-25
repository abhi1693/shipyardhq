import { z } from "zod"
import { CategorySelectObjectSchema } from "./CategorySelect.schema"
import { CategoryIncludeObjectSchema } from "./CategoryInclude.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    select: z.lazy(() => CategorySelectObjectSchema).optional(),
    include: z.lazy(() => CategoryIncludeObjectSchema).optional(),
  })
  .strict()

export const CategoryArgsObjectSchema = Schema
