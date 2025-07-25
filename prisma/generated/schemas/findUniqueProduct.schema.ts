import { z } from "zod"
import { ProductSelectObjectSchema } from "./objects/ProductSelect.schema"
import { ProductIncludeObjectSchema } from "./objects/ProductInclude.schema"
import { ProductWhereUniqueInputObjectSchema } from "./objects/ProductWhereUniqueInput.schema"

export const ProductFindUniqueSchema = z.object({
  select: ProductSelectObjectSchema.optional(),
  include: ProductIncludeObjectSchema.optional(),
  where: ProductWhereUniqueInputObjectSchema,
})
