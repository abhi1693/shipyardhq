import { z } from "zod"
import { UserWhereUniqueInputObjectSchema } from "./UserWhereUniqueInput.schema"
import { UserCreateWithoutProductsInputObjectSchema } from "./UserCreateWithoutProductsInput.schema"
import { UserUncheckedCreateWithoutProductsInputObjectSchema } from "./UserUncheckedCreateWithoutProductsInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    where: z.lazy(() => UserWhereUniqueInputObjectSchema),
    create: z.union([
      z.lazy(() => UserCreateWithoutProductsInputObjectSchema),
      z.lazy(() => UserUncheckedCreateWithoutProductsInputObjectSchema),
    ]),
  })
  .strict()

export const UserCreateOrConnectWithoutProductsInputObjectSchema = Schema
