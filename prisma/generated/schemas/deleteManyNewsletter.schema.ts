import { z } from "zod"
import { NewsletterWhereInputObjectSchema } from "./objects/NewsletterWhereInput.schema"

export const NewsletterDeleteManySchema = z.object({
  where: NewsletterWhereInputObjectSchema.optional(),
})
