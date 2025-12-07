"use server"

export type SubmitReviewState = {
  status: "idle" | "success" | "error"
  message?: string
  errors?: {
    productId?: string
    rating?: string
    message?: string
  }
}

export async function submitProductReviewAction(): Promise<SubmitReviewState> {
  return {
    status: "error",
    message: "Product reviews are disabled.",
  }
}
