"use server"

import { z } from "zod"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import {
  revalidateProduct,
  revalidateProductReviews,
} from "@/lib/cache/revalidate"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import { upsertProductReview } from "@/lib/server/productReviews"
import { syncUserFromClerk } from "@/actions/member/users/actions"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import { dispatchEventAsync } from "@/lib/server/events"
import { notifyNovuProductReview } from "@/lib/server/notifications/novuEvents"
import "@/lib/server/rewards/listeners"

export type SubmitReviewState = {
  status: "idle" | "success" | "error"
  message?: string
  errors?: {
    productId?: string
    rating?: string
    message?: string
  }
}

const schema = z.object({
  productId: z.string().min(1, "Missing product"),
  rating: z.coerce
    .number()
    .min(0, "Rating must be at least 0")
    .max(5, "Rating cannot exceed 5"),
  message: z.string().trim().min(5, "Share a quick note about your experience"),
})

export async function submitProductReviewAction(
  _prevState: SubmitReviewState,
  formData: FormData,
): Promise<SubmitReviewState> {
  const parsed = schema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    message: formData.get("message"),
  })

  if (!parsed.success) {
    const formErrors = parsed.error.flatten().fieldErrors
    return {
      status: "error",
      errors: {
        productId: formErrors.productId?.[0],
        rating: formErrors.rating?.[0],
        message: formErrors.message?.[0],
      },
    }
  }

  const { productId, rating, message } = parsed.data

  const authResult = await auth()
  if (!authResult?.userId) {
    return {
      status: "error",
      message: "Please sign in to leave a review.",
    }
  }

  let user = await getActiveUserByClerkId(authResult.userId)
  if (!user) {
    try {
      const clerkUser = await getClerkUserByIdCached(authResult.userId)
      await syncUserFromClerk(clerkUser)
      user = await getActiveUserByClerkId(authResult.userId)
    } catch (error) {
      console.error("[reviews] failed to sync user from Clerk", {
        userId: authResult.userId,
        error,
      })
    }
  }
  if (!user) {
    return { status: "error", message: INACTIVE_ACCOUNT_MESSAGE }
  }

  // Ensure the product exists and is published before accepting reviews
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, status: true, userId: true },
  })

  if (!product) {
    return {
      status: "error",
      message: "Product not found.",
    }
  }

  if (product.status !== "published") {
    return {
      status: "error",
      message: "Reviews are only available for published products.",
    }
  }

  try {
    const review = await upsertProductReview({
      productId: product.id,
      userId: user.id,
      rating,
      message,
    })

    const eventPayload = {
      reviewId: review.id,
      productId: product.id,
      productOwnerId: product.userId,
      userId: user.id,
      rating: review.rating,
      messageLength: review.message.length,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    }

    dispatchEventAsync("product.reviewed", eventPayload, {
      context: { productId: product.id, reviewId: review.id },
    })

    await notifyNovuProductReview(eventPayload)
  } catch (error: any) {
    return {
      status: "error",
      message: error?.message || "Something went wrong. Please try again.",
    }
  }

  revalidateProduct(product.id)
  if (product.slug) {
    revalidateProduct(product.slug)
    revalidateProductReviews(product.slug)
  }
  revalidateProductReviews(product.id)

  return {
    status: "success",
    message: "Thanks for the feedback!",
  }
}
