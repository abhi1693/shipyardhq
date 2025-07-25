import { z } from "zod"
import { ProductSelectObjectSchema } from "./objects/ProductSelect.schema"
import { ProductIncludeObjectSchema } from "./objects/ProductInclude.schema"
import { ProductOrderByWithRelationInputObjectSchema } from "./objects/ProductOrderByWithRelationInput.schema"
import { ProductWhereInputObjectSchema } from "./objects/ProductWhereInput.schema"
import { ProductWhereUniqueInputObjectSchema } from "./objects/ProductWhereUniqueInput.schema"
import { ProductScalarFieldEnumSchema } from "./enums/ProductScalarFieldEnum.schema"

export const ProductFindManySchema = z.object({
  select: z.lazy(() => ProductSelectObjectSchema.optional()),
  include: z.lazy(() => ProductIncludeObjectSchema.optional()),
  orderBy: z
    .union([
      ProductOrderByWithRelationInputObjectSchema,
      ProductOrderByWithRelationInputObjectSchema.array(),
    ])
    .optional(),
  where: ProductWhereInputObjectSchema.optional(),
  cursor: ProductWhereUniqueInputObjectSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.array(ProductScalarFieldEnumSchema).optional(),
})
