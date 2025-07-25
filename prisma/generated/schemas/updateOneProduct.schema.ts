import { z } from "zod"
import { ProductSelectObjectSchema } from "./objects/ProductSelect.schema"
import { ProductIncludeObjectSchema } from "./objects/ProductInclude.schema"
import { ProductUpdateInputObjectSchema } from "./objects/ProductUpdateInput.schema"
import { ProductUncheckedUpdateInputObjectSchema } from "./objects/ProductUncheckedUpdateInput.schema"
import { ProductWhereUniqueInputObjectSchema } from "./objects/ProductWhereUniqueInput.schema"

export const ProductUpdateOneSchema = z.object({
  select: ProductSelectObjectSchema.optional(),
  include: ProductIncludeObjectSchema.optional(),
  data: z.union([
    ProductUpdateInputObjectSchema,
    ProductUncheckedUpdateInputObjectSchema,
  ]),
  where: ProductWhereUniqueInputObjectSchema,
})
