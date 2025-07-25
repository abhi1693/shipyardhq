import { z } from "zod"
import { ProductCreateManyInputObjectSchema } from "./objects/ProductCreateManyInput.schema"

export const ProductCreateManySchema = z.object({
  data: z.union([
    ProductCreateManyInputObjectSchema,
    z.array(ProductCreateManyInputObjectSchema),
  ]),
  skipDuplicates: z.boolean().optional(),
})
