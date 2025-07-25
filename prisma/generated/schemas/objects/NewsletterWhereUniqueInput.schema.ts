import { z } from "zod"
import { NewsletterWhereInputObjectSchema } from "./NewsletterWhereInput.schema"
import { DateTimeFilterObjectSchema } from "./DateTimeFilter.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<Prisma.NewsletterWhereUniqueInput> = z
  .object({
    id: z.string(),
    email: z.string(),
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
    createdAt: z
      .union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()])
      .optional(),
  })
  .strict()

export const NewsletterWhereUniqueInputObjectSchema = Schema
