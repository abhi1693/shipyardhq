import { resolveApiError } from "@/lib/fastapi"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import {
  parseProductId,
  type PublicProductUpvoteState,
} from "@/actions/public/products/actions"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

export type UpvoteState = { upvotes: number; upvoted: boolean; error?: string }

export interface ToggleProductUpvoteOptions {
  productId: string
  authToken: string
}

export class UpvoteError extends Error {
  status: number
  constructor(
    message: string,
    status: number,
    public cause?: unknown,
  ) {
    super(message)
    this.name = "UpvoteError"
    this.status = status
  }
}

export async function toggleProductUpvote({
  productId,
  authToken,
}: ToggleProductUpvoteOptions): Promise<UpvoteState> {
  const productPk = parseProductId(productId)
  if (!productPk) {
    throw new UpvoteError("Missing productId", 400)
  }

  if (!authToken) {
    throw new UpvoteError("Unauthorized", 401)
  }

  try {
    const response = await fastapiFetch<ApiResponse<PublicProductUpvoteState>>(
      `/api/v1/public/products/${productPk}/upvote`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    )

    if (response.status !== 200) {
      throw new UpvoteError("Failed", response.status)
    }

    return {
      upvotes: response.data.upvotes ?? 0,
      upvoted: response.data.upvoted ?? false,
    }
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status ?? 500
    const message = resolveApiError(error, "Failed to update upvote")

    if (status === 401 || status === 403) {
      throw new UpvoteError(message || "Unauthorized", status, error)
    }
    if (status === 404) {
      throw new UpvoteError("Not Found", status, error)
    }

    throw new UpvoteError(message || "Failed", status, error)
  }
}
