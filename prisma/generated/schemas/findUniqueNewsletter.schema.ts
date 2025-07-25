import { z } from "zod"
import { NewsletterSelectObjectSchema } from "./objects/NewsletterSelect.schema"
import { NewsletterWhereUniqueInputObjectSchema } from "./objects/NewsletterWhereUniqueInput.schema"

export const NewsletterFindUniqueSchema = z.object({
  select: NewsletterSelectObjectSchema.optional(),
  where: NewsletterWhereUniqueInputObjectSchema,
})
