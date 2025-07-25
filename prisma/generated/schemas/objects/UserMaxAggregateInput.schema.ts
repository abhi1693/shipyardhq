import { z } from "zod"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: z.literal(true).optional(),
    clerkId: z.literal(true).optional(),
    email: z.literal(true).optional(),
    firstName: z.literal(true).optional(),
    lastName: z.literal(true).optional(),
    role: z.literal(true).optional(),
    createdAt: z.literal(true).optional(),
    updatedAt: z.literal(true).optional(),
  })
  .strict()

export const UserMaxAggregateInputObjectSchema = Schema
