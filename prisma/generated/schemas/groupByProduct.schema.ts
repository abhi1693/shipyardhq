import { z } from "zod"
import { ProductWhereInputObjectSchema } from "./objects/ProductWhereInput.schema"
import { ProductOrderByWithAggregationInputObjectSchema } from "./objects/ProductOrderByWithAggregationInput.schema"
import { ProductScalarWhereWithAggregatesInputObjectSchema } from "./objects/ProductScalarWhereWithAggregatesInput.schema"
import { ProductScalarFieldEnumSchema } from "./enums/ProductScalarFieldEnum.schema"

export const ProductGroupBySchema = z.object({
  where: ProductWhereInputObjectSchema.optional(),
  orderBy: z
    .union([
      ProductOrderByWithAggregationInputObjectSchema,
      ProductOrderByWithAggregationInputObjectSchema.array(),
    ])
    .optional(),
  having: ProductScalarWhereWithAggregatesInputObjectSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  by: z.array(ProductScalarFieldEnumSchema),
})
