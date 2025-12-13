import { NextResponse, type NextRequest } from "next/server"

import prisma from "@/lib/prisma"
import { addUtmParams } from "@/lib/marketing/utm"
import { productPath } from "@/lib/routes"
import { ensureUrlHasSchema } from "@/lib/utils"

const isSafeHttpUrl = (rawUrl: string): rawUrl is string => {
  try {
    const url = new URL(rawUrl)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export async function redirectToProductWebsite(
  request: NextRequest,
  {
    slug,
    utmContent,
  }: {
    slug: string
    utmContent: string
  },
) {
  const product = await prisma.product.findFirst({
    where: { slug, status: "published" },
    select: {
      websiteUrl: true,
      metadata: {
        select: {
          utmCampaign: true,
        },
      },
    },
  })

  const fallback = new URL(productPath(slug), request.url)

  if (!product?.websiteUrl) {
    return NextResponse.redirect(fallback)
  }

  const destination = addUtmParams(ensureUrlHasSchema(product.websiteUrl), {
    source: "shipyard",
    medium: "referral",
    campaign: product.metadata?.utmCampaign ?? undefined,
    content: utmContent,
  })

  if (!isSafeHttpUrl(destination)) {
    return NextResponse.redirect(fallback)
  }

  const response = NextResponse.redirect(destination, 307)
  response.headers.set("Cache-Control", "no-store")
  return response
}
