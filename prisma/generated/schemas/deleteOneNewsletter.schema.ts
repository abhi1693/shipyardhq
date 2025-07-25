import { z } from "zod"
import { NewsletterSelectObjectSchema } from "./objects/NewsletterSelect.schema"
import { NewsletterWhereUniqueInputObjectSchema } from "./objects/NewsletterWhereUniqueInput.schema"

export const NewsletterDeleteOneSchema = z.object({
  select: NewsletterSelectObjectSchema.optional(),
  where: NewsletterWhereUniqueInputObjectSchema,
})
