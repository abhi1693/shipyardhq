import { NextResponse } from "next/server"
import { deleteProductAction } from "@/actions/admin/products/actions"
import prisma from "@/lib/prisma"

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url))
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params

  if (!slug) {
    return redirectTo(request, "/member/products?status=invalid")
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!product?.id) {
    return redirectTo(request, "/member/products?status=not-found")
  }

  const result = await deleteProductAction(product.id)

  if ("error" in result) {
    return redirectTo(request, "/member/products?status=error")
  }

  return redirectTo(request, "/member/products?status=deleted")
}
