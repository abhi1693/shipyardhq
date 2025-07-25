import { z } from "zod"
import { CategoryCreateManyInputObjectSchema } from "./objects/CategoryCreateManyInput.schema"

export const CategoryCreateManySchema = z.object({
  data: z.union([
    CategoryCreateManyInputObjectSchema,
    z.array(CategoryCreateManyInputObjectSchema),
  ]),
  skipDuplicates: z.boolean().optional(),
})
