import { z } from "zod"
import { NewsletterSelectObjectSchema } from "./objects/NewsletterSelect.schema"
import { NewsletterWhereUniqueInputObjectSchema } from "./objects/NewsletterWhereUniqueInput.schema"
import { NewsletterCreateInputObjectSchema } from "./objects/NewsletterCreateInput.schema"
import { NewsletterUncheckedCreateInputObjectSchema } from "./objects/NewsletterUncheckedCreateInput.schema"
import { NewsletterUpdateInputObjectSchema } from "./objects/NewsletterUpdateInput.schema"
import { NewsletterUncheckedUpdateInputObjectSchema } from "./objects/NewsletterUncheckedUpdateInput.schema"

export const NewsletterUpsertSchema = z.object({
  select: NewsletterSelectObjectSchema.optional(),
  where: NewsletterWhereUniqueInputObjectSchema,
  create: z.union([
    NewsletterCreateInputObjectSchema,
    NewsletterUncheckedCreateInputObjectSchema,
  ]),
  update: z.union([
    NewsletterUpdateInputObjectSchema,
    NewsletterUncheckedUpdateInputObjectSchema,
  ]),
})
