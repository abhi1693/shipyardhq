import { z } from "zod"
import { ProductCreateNestedManyWithoutUserInputObjectSchema } from "./ProductCreateNestedManyWithoutUserInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    id: z.string().optional(),
    clerkId: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    products: z
      .lazy(() => ProductCreateNestedManyWithoutUserInputObjectSchema)
      .optional(),
  })
  .strict()

export const UserCreateInputObjectSchema = Schema
