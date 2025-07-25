import { z } from "zod"
import { UserUpdateWithoutProductsInputObjectSchema } from "./UserUpdateWithoutProductsInput.schema"
import { UserUncheckedUpdateWithoutProductsInputObjectSchema } from "./UserUncheckedUpdateWithoutProductsInput.schema"
import { UserCreateWithoutProductsInputObjectSchema } from "./UserCreateWithoutProductsInput.schema"
import { UserUncheckedCreateWithoutProductsInputObjectSchema } from "./UserUncheckedCreateWithoutProductsInput.schema"
import { UserWhereInputObjectSchema } from "./UserWhereInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    update: z.union([
      z.lazy(() => UserUpdateWithoutProductsInputObjectSchema),
      z.lazy(() => UserUncheckedUpdateWithoutProductsInputObjectSchema),
    ]),
    create: z.union([
      z.lazy(() => UserCreateWithoutProductsInputObjectSchema),
      z.lazy(() => UserUncheckedCreateWithoutProductsInputObjectSchema),
    ]),
    where: z.lazy(() => UserWhereInputObjectSchema).optional(),
  })
  .strict()

export const UserUpsertWithoutProductsInputObjectSchema = Schema
