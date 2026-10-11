import { createHash, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import {
  InvalidProductsPaginationError,
  listProductsForApi,
  parseProductsPagination,
} from "@/lib/server/productsApi"

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization",
}

export async function GET(request: Request) {
  const expectedToken = process.env.PRODUCTS_API_TOKEN?.trim()
  const planId = process.env.PRODUCTS_API_PLAN_ID?.trim()
  if (!expectedToken || !planId) {
    return NextResponse.json(
      { error: "products_api_unavailable" },
      { status: 503, headers: PRIVATE_HEADERS },
    )
  }

  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer[ \t]+(\S+)$/i)?.[1]
  if (
    !token ||
    !timingSafeEqual(
      createHash("sha256").update(token).digest(),
      createHash("sha256").update(expectedToken).digest(),
    )
  ) {
    return NextResponse.json(
      { error: "unauthorized" },
      {
        status: 401,
        headers: { ...PRIVATE_HEADERS, "WWW-Authenticate": "Bearer" },
      },
    )
  }

  try {
    const pagination = parseProductsPagination(
      new URL(request.url).searchParams,
      planId,
    )
    const page = await listProductsForApi({ planId, ...pagination })
    return NextResponse.json(page, { headers: PRIVATE_HEADERS })
  } catch (error) {
    if (error instanceof InvalidProductsPaginationError) {
      return NextResponse.json(
        { error: "invalid_pagination" },
        { status: 400, headers: PRIVATE_HEADERS },
      )
    }

    console.error("[products-api] Failed to list products")
    return NextResponse.json(
      { error: "products_unavailable" },
      { status: 500, headers: PRIVATE_HEADERS },
    )
  }
}
