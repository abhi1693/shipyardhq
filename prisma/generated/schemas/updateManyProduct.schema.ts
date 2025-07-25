import { z } from "zod"
import { ProductUpdateManyMutationInputObjectSchema } from "./objects/ProductUpdateManyMutationInput.schema"
import { ProductWhereInputObjectSchema } from "./objects/ProductWhereInput.schema"

export const ProductUpdateManySchema = z.object({
  data: ProductUpdateManyMutationInputObjectSchema,
  where: ProductWhereInputObjectSchema.optional(),
})
