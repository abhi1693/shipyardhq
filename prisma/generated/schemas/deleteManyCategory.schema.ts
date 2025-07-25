import { z } from "zod"
import { CategoryWhereInputObjectSchema } from "./objects/CategoryWhereInput.schema"

export const CategoryDeleteManySchema = z.object({
  where: CategoryWhereInputObjectSchema.optional(),
})
