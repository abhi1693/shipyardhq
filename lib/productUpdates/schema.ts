import { z } from "zod"

export const productUpdateStatusSchema = z.enum(["draft", "published"])

export const productUpdateInputSchema = z.object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters long")
      .max(120, "Title must be under 120 characters"),
  summary: z
    .string()
    .trim()
    .max(240, "Summary must be under 240 characters")
    .optional(),
    content: z
      .string()
      .trim()
      .min(10, "Update details must be at least 10 characters long")
    .refine(
      (value) => !/(^|\n)\s*#(?!#)/.test(value),
      "Use Heading 2 or smaller (##, ###, etc.) instead of level 1 headings.",
    ),
  status: productUpdateStatusSchema.default("published"),
})

export type ProductUpdateInput = z.infer<typeof productUpdateInputSchema>
