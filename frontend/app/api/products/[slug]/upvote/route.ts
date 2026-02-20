import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

import {
  getPublicProductMetaBySlugServer,
  togglePublicProductUpvoteServer,
  UpvoteServerError,
} from "@/lib/server/generated-public"

interface RouteParams {
  params: Promise<{ slug?: string }>
}

export async function POST(_request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const slug = resolvedParams.slug?.trim()
  if (!slug) {
    return NextResponse.json({ error: "Missing product slug" }, { status: 400 })
  }

  const product = await getPublicProductMetaBySlugServer(slug)
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 })
  }

  const authResult = await auth()
  if (!authResult?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = authResult.getToken ? await authResult.getToken() : null
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await togglePublicProductUpvoteServer({
      productId: product.id,
      authToken: token,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof UpvoteServerError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 500 },
      )
    }

    console.error("Upvote API error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
