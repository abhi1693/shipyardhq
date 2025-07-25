import { z } from "zod"
import { UserCreateWithoutProductsInputObjectSchema } from "./UserCreateWithoutProductsInput.schema"
import { UserUncheckedCreateWithoutProductsInputObjectSchema } from "./UserUncheckedCreateWithoutProductsInput.schema"
import { UserCreateOrConnectWithoutProductsInputObjectSchema } from "./UserCreateOrConnectWithoutProductsInput.schema"
import { UserWhereUniqueInputObjectSchema } from "./UserWhereUniqueInput.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    create: z
      .union([
        z.lazy(() => UserCreateWithoutProductsInputObjectSchema),
        z.lazy(() => UserUncheckedCreateWithoutProductsInputObjectSchema),
      ])
      .optional(),
    connectOrCreate: z
      .lazy(() => UserCreateOrConnectWithoutProductsInputObjectSchema)
      .optional(),
    connect: z.lazy(() => UserWhereUniqueInputObjectSchema).optional(),
  })
  .strict()

export const UserCreateNestedOneWithoutProductsInputObjectSchema = Schema
