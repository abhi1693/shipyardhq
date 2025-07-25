import { z } from "zod"
import { UserArgsObjectSchema } from "./UserArgs.schema"
import { CategoryArgsObjectSchema } from "./CategoryArgs.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    user: z.union([z.boolean(), z.lazy(() => UserArgsObjectSchema)]).optional(),
    category: z
      .union([z.boolean(), z.lazy(() => CategoryArgsObjectSchema)])
      .optional(),
  })
  .strict()

export const ProductIncludeObjectSchema = Schema
