import { NextResponse } from "next/server"
import { deleteProductAction } from "@/actions/admin/products/actions"

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url))
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  if (!id) {
    return redirectTo(request, "/admin/products?status=invalid")
  }

  const result = await deleteProductAction(id)

  if ("error" in result) {
    return redirectTo(request, "/admin/products?status=error")
  }

  return redirectTo(request, "/admin/products?status=deleted")
}
