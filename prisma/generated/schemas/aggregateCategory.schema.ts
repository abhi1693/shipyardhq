import { z } from "zod"
import { CategoryOrderByWithRelationInputObjectSchema } from "./objects/CategoryOrderByWithRelationInput.schema"
import { CategoryWhereInputObjectSchema } from "./objects/CategoryWhereInput.schema"
import { CategoryWhereUniqueInputObjectSchema } from "./objects/CategoryWhereUniqueInput.schema"
import { CategoryCountAggregateInputObjectSchema } from "./objects/CategoryCountAggregateInput.schema"
import { CategoryMinAggregateInputObjectSchema } from "./objects/CategoryMinAggregateInput.schema"
import { CategoryMaxAggregateInputObjectSchema } from "./objects/CategoryMaxAggregateInput.schema"

export const CategoryAggregateSchema = z.object({
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
  _count: z
    .union([z.literal(true), CategoryCountAggregateInputObjectSchema])
    .optional(),
  _min: CategoryMinAggregateInputObjectSchema.optional(),
  _max: CategoryMaxAggregateInputObjectSchema.optional(),
})
