import { z } from "zod"
import { CategorySelectObjectSchema } from "./objects/CategorySelect.schema"
import { CategoryIncludeObjectSchema } from "./objects/CategoryInclude.schema"
import { CategoryWhereUniqueInputObjectSchema } from "./objects/CategoryWhereUniqueInput.schema"

export const CategoryFindUniqueSchema = z.object({
  select: CategorySelectObjectSchema.optional(),
  include: CategoryIncludeObjectSchema.optional(),
  where: CategoryWhereUniqueInputObjectSchema,
})
