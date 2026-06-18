import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"

import {
  toggleProductUpvote,
  UpvoteError,
} from "@/actions/public/products/upvote"
import { hasUserUpvoted } from "@/actions/public/products/actions"
import prisma from "@/lib/prisma"

interface RouteContext {
  params: Promise<{ slug?: string }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  const slug = resolvedParams.slug?.trim()
  if (!slug) {
    return NextResponse.json({ error: "Missing product slug" }, { status: 400 })
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      analytics: { select: { upvotes: true } },
      _count: { select: { ProductUpvote: true } },
    },
  })
  if (!product || product.status !== "published") {
    return NextResponse.json({ error: "Product not found" }, { status: 404 })
  }

  const authResult = await auth()
  const clerkUserId = authResult?.userId ?? null
  const upvotes = product.analytics?.upvotes ?? product._count.ProductUpvote

  if (!clerkUserId) {
    return NextResponse.json({
      viewerSignedIn: false,
      upvoted: false,
      upvotes,
    })
  }

  const upvoted = await hasUserUpvoted(product.id, clerkUserId).catch(
    () => false,
  )

  return NextResponse.json({
    viewerSignedIn: true,
    upvoted,
    upvotes,
  })
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  const slug = resolvedParams.slug?.trim()
  if (!slug) {
    return NextResponse.json({ error: "Missing product slug" }, { status: 400 })
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, status: true },
  })
  if (!product || product.status !== "published") {
    return NextResponse.json({ error: "Product not found" }, { status: 404 })
  }

  const authResult = await auth()
  if (!authResult?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await toggleProductUpvote({
      productId: product.id,
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
