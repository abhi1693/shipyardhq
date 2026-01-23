import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"

import prisma from "@/lib/prisma"
import { memberProductsStatusPath } from "@/lib/routes"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
export type ManageableProductSummary = {
  id: string
  name: string
  slug: string
  userId: string
}

type ActiveUser = NonNullable<
  Awaited<ReturnType<typeof getActiveUserByClerkId>>
>

type RequireOptions = {
  unauthorizedRedirect?: string | null
  missingRedirect?: string | null
}

function handleMissing(redirectPath: string | null | undefined) {
  if (redirectPath === null) {
    notFound()
  }
  if (redirectPath) {
    redirect(redirectPath)
  }
  notFound()
}

function handleUnauthorized(redirectPath: string | null | undefined) {
  if (redirectPath === null) {
    notFound()
  }
  redirect(redirectPath ?? memberProductsStatusPath("unauthorized"))
}

export async function requireManageableProduct(
  slug: string,
  options: RequireOptions = {},
): Promise<{ product: ManageableProductSummary; currentUser: ActiveUser }> {
  const { unauthorizedRedirect, missingRedirect } = options

  const { userId: clerkId } = await auth()
  if (!clerkId) {
    handleUnauthorized(unauthorizedRedirect)
  }

  const currentUser = await getActiveUserByClerkId(clerkId!)
  if (!currentUser) {
    handleUnauthorized(unauthorizedRedirect)
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      userId: true,
    },
  })

  if (!product) {
    handleMissing(missingRedirect)
  }

  const canManage = product!.userId === currentUser!.id

  if (!canManage) {
    handleUnauthorized(unauthorizedRedirect)
  }

  return {
    product: product!,
    currentUser: currentUser!,
  }
}
