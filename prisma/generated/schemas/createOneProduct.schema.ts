import { z } from "zod"
import { ProductSelectObjectSchema } from "./objects/ProductSelect.schema"
import { ProductIncludeObjectSchema } from "./objects/ProductInclude.schema"
import { ProductCreateInputObjectSchema } from "./objects/ProductCreateInput.schema"
import { ProductUncheckedCreateInputObjectSchema } from "./objects/ProductUncheckedCreateInput.schema"

export const ProductCreateOneSchema = z.object({
  select: ProductSelectObjectSchema.optional(),
  include: ProductIncludeObjectSchema.optional(),
  data: z.union([
    ProductCreateInputObjectSchema,
    ProductUncheckedCreateInputObjectSchema,
  ]),
})
