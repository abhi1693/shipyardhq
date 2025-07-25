import { z } from "zod"
import { NewsletterSelectObjectSchema } from "./objects/NewsletterSelect.schema"
import { NewsletterCreateInputObjectSchema } from "./objects/NewsletterCreateInput.schema"
import { NewsletterUncheckedCreateInputObjectSchema } from "./objects/NewsletterUncheckedCreateInput.schema"

export const NewsletterCreateOneSchema = z.object({
  select: NewsletterSelectObjectSchema.optional(),
  data: z.union([
    NewsletterCreateInputObjectSchema,
    NewsletterUncheckedCreateInputObjectSchema,
  ]),
})
