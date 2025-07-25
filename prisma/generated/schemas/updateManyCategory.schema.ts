import { z } from "zod"
import { CategoryUpdateManyMutationInputObjectSchema } from "./objects/CategoryUpdateManyMutationInput.schema"
import { CategoryWhereInputObjectSchema } from "./objects/CategoryWhereInput.schema"

export const CategoryUpdateManySchema = z.object({
  data: CategoryUpdateManyMutationInputObjectSchema,
  where: CategoryWhereInputObjectSchema.optional(),
})
