import { z } from "zod"
import { ProductFindManySchema } from "../findManyProduct.schema"
import { UserCountOutputTypeArgsObjectSchema } from "./UserCountOutputTypeArgs.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: z.boolean().optional(),
    clerkId: z.boolean().optional(),
    email: z.boolean().optional(),
    firstName: z.boolean().optional(),
    lastName: z.boolean().optional(),
    role: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    products: z
      .union([z.boolean(), z.lazy(() => ProductFindManySchema)])
      .optional(),
    _count: z
      .union([z.boolean(), z.lazy(() => UserCountOutputTypeArgsObjectSchema)])
      .optional(),
  })
  .strict()

export const UserSelectObjectSchema = Schema
