import { z } from "zod"
import { NewsletterSelectObjectSchema } from "./NewsletterSelect.schema"

import type { Prisma } from "@prisma/client"

const Schema: z.ZodType<any> = z
  .object({
    select: z.lazy(() => NewsletterSelectObjectSchema).optional(),
  })
  .strict()

export const NewsletterArgsObjectSchema = Schema
