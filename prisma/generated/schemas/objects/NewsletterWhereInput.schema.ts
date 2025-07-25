import { z } from "zod"
import { StringFilterObjectSchema } from "./StringFilter.schema"
import { DateTimeFilterObjectSchema } from "./DateTimeFilter.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<Prisma.NewsletterWhereInput> = z
  .object({
    AND: z
      .union([
        z.lazy(() => NewsletterWhereInputObjectSchema),
        z.lazy(() => NewsletterWhereInputObjectSchema).array(),
      ])
      .optional(),
    OR: z
      .lazy(() => NewsletterWhereInputObjectSchema)
      .array()
      .optional(),
    NOT: z
      .union([
        z.lazy(() => NewsletterWhereInputObjectSchema),
        z.lazy(() => NewsletterWhereInputObjectSchema).array(),
      ])
      .optional(),
    id: z
      .union([z.lazy(() => StringFilterObjectSchema), z.string()])
      .optional(),
    email: z
      .union([z.lazy(() => StringFilterObjectSchema), z.string()])
      .optional(),
    createdAt: z
      .union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()])
      .optional(),
  })
  .strict()

export const NewsletterWhereInputObjectSchema = Schema
