import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  toggleProductUpvote,
  UpvoteError,
} from "@/actions/public/products/upvote"

interface RouteParams {
  params: Promise<{ id?: string }>
}

export async function POST(_request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const productId = resolvedParams.id?.trim()
  if (!productId) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 })
  }

  const authResult = await auth()
  if (!authResult?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await toggleProductUpvote({
      productId,
      clerkUserId: authResult.userId,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof UpvoteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 500 },
      )
    }

    console.error("Upvote API error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
