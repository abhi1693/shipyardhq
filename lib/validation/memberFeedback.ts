import { z } from "zod"

export const memberFeedbackSchema = z.object({
  subject: z
    .string()
    .trim()
    .max(120, { message: "Subject cannot exceed 120 characters" })
    .optional()
    .refine((value) => value == null || value.length === 0 || value.length >= 3, {
      message: "Subject must be at least 3 characters",
    }),
  message: z
    .string()
    .trim()
    .min(1, { message: "Feedback message is required" })
    .min(20, { message: "Feedback must be at least 20 characters" })
    .max(2000, { message: "Feedback cannot exceed 2000 characters" }),
  rating: z.enum(["1", "2", "3", "4", "5"]).optional(),
})

export type MemberFeedbackFormValues = z.infer<typeof memberFeedbackSchema>
