import { z } from "zod"
import { CategorySelectObjectSchema } from "./objects/CategorySelect.schema"
import { CategoryIncludeObjectSchema } from "./objects/CategoryInclude.schema"
import { CategoryUpdateInputObjectSchema } from "./objects/CategoryUpdateInput.schema"
import { CategoryUncheckedUpdateInputObjectSchema } from "./objects/CategoryUncheckedUpdateInput.schema"
import { CategoryWhereUniqueInputObjectSchema } from "./objects/CategoryWhereUniqueInput.schema"

export const CategoryUpdateOneSchema = z.object({
  select: CategorySelectObjectSchema.optional(),
  include: CategoryIncludeObjectSchema.optional(),
  data: z.union([
    CategoryUpdateInputObjectSchema,
    CategoryUncheckedUpdateInputObjectSchema,
  ]),
  where: CategoryWhereUniqueInputObjectSchema,
})
