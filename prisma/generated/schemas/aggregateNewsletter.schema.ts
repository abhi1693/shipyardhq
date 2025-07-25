import { z } from "zod"
import { NewsletterOrderByWithRelationInputObjectSchema } from "./objects/NewsletterOrderByWithRelationInput.schema"
import { NewsletterWhereInputObjectSchema } from "./objects/NewsletterWhereInput.schema"
import { NewsletterWhereUniqueInputObjectSchema } from "./objects/NewsletterWhereUniqueInput.schema"
import { NewsletterCountAggregateInputObjectSchema } from "./objects/NewsletterCountAggregateInput.schema"
import { NewsletterMinAggregateInputObjectSchema } from "./objects/NewsletterMinAggregateInput.schema"
import { NewsletterMaxAggregateInputObjectSchema } from "./objects/NewsletterMaxAggregateInput.schema"

export const NewsletterAggregateSchema = z.object({
  orderBy: z
    .union([
      NewsletterOrderByWithRelationInputObjectSchema,
      NewsletterOrderByWithRelationInputObjectSchema.array(),
    ])
    .optional(),
  where: NewsletterWhereInputObjectSchema.optional(),
  cursor: NewsletterWhereUniqueInputObjectSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  _count: z
    .union([z.literal(true), NewsletterCountAggregateInputObjectSchema])
    .optional(),
  _min: NewsletterMinAggregateInputObjectSchema.optional(),
  _max: NewsletterMaxAggregateInputObjectSchema.optional(),
})
