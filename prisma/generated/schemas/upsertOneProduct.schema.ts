import { z } from "zod"
import { ProductSelectObjectSchema } from "./objects/ProductSelect.schema"
import { ProductIncludeObjectSchema } from "./objects/ProductInclude.schema"
import { ProductWhereUniqueInputObjectSchema } from "./objects/ProductWhereUniqueInput.schema"
import { ProductCreateInputObjectSchema } from "./objects/ProductCreateInput.schema"
import { ProductUncheckedCreateInputObjectSchema } from "./objects/ProductUncheckedCreateInput.schema"
import { ProductUpdateInputObjectSchema } from "./objects/ProductUpdateInput.schema"
import { ProductUncheckedUpdateInputObjectSchema } from "./objects/ProductUncheckedUpdateInput.schema"

export const ProductUpsertSchema = z.object({
  select: ProductSelectObjectSchema.optional(),
  include: ProductIncludeObjectSchema.optional(),
  where: ProductWhereUniqueInputObjectSchema,
  create: z.union([
    ProductCreateInputObjectSchema,
    ProductUncheckedCreateInputObjectSchema,
  ]),
  update: z.union([
    ProductUpdateInputObjectSchema,
    ProductUncheckedUpdateInputObjectSchema,
  ]),
})
