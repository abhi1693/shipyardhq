import { z } from "zod"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    products: z.boolean().optional(),
  })
  .strict()

export const UserCountOutputTypeSelectObjectSchema = Schema
