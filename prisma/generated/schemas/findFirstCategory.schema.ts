import { z } from "zod"
import { CategorySelectObjectSchema } from "./objects/CategorySelect.schema"
import { CategoryIncludeObjectSchema } from "./objects/CategoryInclude.schema"
import { CategoryOrderByWithRelationInputObjectSchema } from "./objects/CategoryOrderByWithRelationInput.schema"
import { CategoryWhereInputObjectSchema } from "./objects/CategoryWhereInput.schema"
import { CategoryWhereUniqueInputObjectSchema } from "./objects/CategoryWhereUniqueInput.schema"
import { CategoryScalarFieldEnumSchema } from "./enums/CategoryScalarFieldEnum.schema"

export const CategoryFindFirstSchema = z.object({
  select: CategorySelectObjectSchema.optional(),
  include: CategoryIncludeObjectSchema.optional(),
  orderBy: z
    .union([
      CategoryOrderByWithRelationInputObjectSchema,
      CategoryOrderByWithRelationInputObjectSchema.array(),
    ])
    .optional(),
  where: CategoryWhereInputObjectSchema.optional(),
  cursor: CategoryWhereUniqueInputObjectSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.array(CategoryScalarFieldEnumSchema).optional(),
})
