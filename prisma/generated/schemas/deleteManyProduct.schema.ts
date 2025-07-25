import { z } from "zod"
import { ProductWhereInputObjectSchema } from "./objects/ProductWhereInput.schema"

export const ProductDeleteManySchema = z.object({
  where: ProductWhereInputObjectSchema.optional(),
})
