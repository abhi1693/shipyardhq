import { z } from "zod"
import { NewsletterCreateManyInputObjectSchema } from "./objects/NewsletterCreateManyInput.schema"

export const NewsletterCreateManySchema = z.object({
  data: z.union([
    NewsletterCreateManyInputObjectSchema,
    z.array(NewsletterCreateManyInputObjectSchema),
  ]),
  skipDuplicates: z.boolean().optional(),
})
