import { z } from "zod"
import { NewsletterWhereInputObjectSchema } from "./objects/NewsletterWhereInput.schema"
import { NewsletterOrderByWithAggregationInputObjectSchema } from "./objects/NewsletterOrderByWithAggregationInput.schema"
import { NewsletterScalarWhereWithAggregatesInputObjectSchema } from "./objects/NewsletterScalarWhereWithAggregatesInput.schema"
import { NewsletterScalarFieldEnumSchema } from "./enums/NewsletterScalarFieldEnum.schema"

export const NewsletterGroupBySchema = z.object({
  where: NewsletterWhereInputObjectSchema.optional(),
  orderBy: z
    .union([
      NewsletterOrderByWithAggregationInputObjectSchema,
      NewsletterOrderByWithAggregationInputObjectSchema.array(),
    ])
    .optional(),
  having: NewsletterScalarWhereWithAggregatesInputObjectSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  by: z.array(NewsletterScalarFieldEnumSchema),
})
