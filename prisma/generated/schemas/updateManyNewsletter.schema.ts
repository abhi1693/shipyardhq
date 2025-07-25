import { z } from "zod"
import { NewsletterUpdateManyMutationInputObjectSchema } from "./objects/NewsletterUpdateManyMutationInput.schema"
import { NewsletterWhereInputObjectSchema } from "./objects/NewsletterWhereInput.schema"

export const NewsletterUpdateManySchema = z.object({
  data: NewsletterUpdateManyMutationInputObjectSchema,
  where: NewsletterWhereInputObjectSchema.optional(),
})
