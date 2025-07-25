import { z } from "zod"
import { NewsletterSelectObjectSchema } from "./objects/NewsletterSelect.schema"
import { NewsletterUpdateInputObjectSchema } from "./objects/NewsletterUpdateInput.schema"
import { NewsletterUncheckedUpdateInputObjectSchema } from "./objects/NewsletterUncheckedUpdateInput.schema"
import { NewsletterWhereUniqueInputObjectSchema } from "./objects/NewsletterWhereUniqueInput.schema"

export const NewsletterUpdateOneSchema = z.object({
  select: NewsletterSelectObjectSchema.optional(),
  data: z.union([
    NewsletterUpdateInputObjectSchema,
    NewsletterUncheckedUpdateInputObjectSchema,
  ]),
  where: NewsletterWhereUniqueInputObjectSchema,
})
