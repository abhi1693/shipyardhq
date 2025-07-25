import { z } from "zod"
import { CategoryCountOutputTypeSelectObjectSchema } from "./CategoryCountOutputTypeSelect.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    select: z.lazy(() => CategoryCountOutputTypeSelectObjectSchema).optional(),
  })
  .strict()

export const CategoryCountOutputTypeArgsObjectSchema = Schema
