import { z } from "zod"
import { NewsletterSelectObjectSchema } from "./objects/NewsletterSelect.schema"
import { NewsletterOrderByWithRelationInputObjectSchema } from "./objects/NewsletterOrderByWithRelationInput.schema"
import { NewsletterWhereInputObjectSchema } from "./objects/NewsletterWhereInput.schema"
import { NewsletterWhereUniqueInputObjectSchema } from "./objects/NewsletterWhereUniqueInput.schema"
import { NewsletterScalarFieldEnumSchema } from "./enums/NewsletterScalarFieldEnum.schema"

export const NewsletterFindManySchema = z.object({
  select: z.lazy(() => NewsletterSelectObjectSchema.optional()),
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
  distinct: z.array(NewsletterScalarFieldEnumSchema).optional(),
})
