import { z } from "zod"
import { UserArgsObjectSchema } from "./UserArgs.schema"
import { CategoryArgsObjectSchema } from "./CategoryArgs.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: z.boolean().optional(),
    name: z.boolean().optional(),
    description: z.boolean().optional(),
    userId: z.boolean().optional(),
    categoryId: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    user: z.union([z.boolean(), z.lazy(() => UserArgsObjectSchema)]).optional(),
    category: z
      .union([z.boolean(), z.lazy(() => CategoryArgsObjectSchema)])
      .optional(),
  })
  .strict()

export const ProductSelectObjectSchema = Schema
