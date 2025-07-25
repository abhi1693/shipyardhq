import { z } from "zod"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().optional().nullable(),
    categoryId: z.string(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict()

export const ProductCreateManyUserInputObjectSchema = Schema
