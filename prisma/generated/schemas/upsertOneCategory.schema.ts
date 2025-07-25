import { z } from "zod"
import { CategorySelectObjectSchema } from "./objects/CategorySelect.schema"
import { CategoryIncludeObjectSchema } from "./objects/CategoryInclude.schema"
import { CategoryWhereUniqueInputObjectSchema } from "./objects/CategoryWhereUniqueInput.schema"
import { CategoryCreateInputObjectSchema } from "./objects/CategoryCreateInput.schema"
import { CategoryUncheckedCreateInputObjectSchema } from "./objects/CategoryUncheckedCreateInput.schema"
import { CategoryUpdateInputObjectSchema } from "./objects/CategoryUpdateInput.schema"
import { CategoryUncheckedUpdateInputObjectSchema } from "./objects/CategoryUncheckedUpdateInput.schema"

export const CategoryUpsertSchema = z.object({
  select: CategorySelectObjectSchema.optional(),
  include: CategoryIncludeObjectSchema.optional(),
  where: CategoryWhereUniqueInputObjectSchema,
  create: z.union([
    CategoryCreateInputObjectSchema,
    CategoryUncheckedCreateInputObjectSchema,
  ]),
  update: z.union([
    CategoryUpdateInputObjectSchema,
    CategoryUncheckedUpdateInputObjectSchema,
  ]),
})
