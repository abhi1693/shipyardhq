import { z } from "zod"
import { UserWhereInputObjectSchema } from "./UserWhereInput.schema"
import { UserUpdateWithoutProductsInputObjectSchema } from "./UserUpdateWithoutProductsInput.schema"
import { UserUncheckedUpdateWithoutProductsInputObjectSchema } from "./UserUncheckedUpdateWithoutProductsInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    where: z.lazy(() => UserWhereInputObjectSchema).optional(),
    data: z.union([
      z.lazy(() => UserUpdateWithoutProductsInputObjectSchema),
      z.lazy(() => UserUncheckedUpdateWithoutProductsInputObjectSchema),
    ]),
  })
  .strict()

export const UserUpdateToOneWithWhereWithoutProductsInputObjectSchema = Schema
