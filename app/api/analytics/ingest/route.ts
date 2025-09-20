import { NextRequest, NextResponse } from "next/server"

import {
  hashIpAddress,
  inferDeviceCategory,
  parseBrowser,
  parseOs,
  sanitizePath,
  sanitizeReferrer,
} from "@/lib/server/analytics/clientMetadata"
import { trackProductTraffic } from "@/lib/server/analytics/productTraffic"
import prisma from "@/lib/prisma"
import type { DeviceCategory } from "@/types/analytics"

function acceptedResponse() {
  return NextResponse.json({ ok: true }, { status: 202 })
}

function pickPrimaryIp(header?: string | null) {
  if (!header) return null
  const [first] = header.split(",")
  return first?.trim() || null
}

function coerceDevice(
  device: DeviceCategory | null | undefined,
): DeviceCategory {
  return device ?? "unknown"
}

export async function POST(request: NextRequest) {
  let body: any = null

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const productId =
    typeof body?.productId === "string" ? body.productId.trim() : ""
  const rawPath = typeof body?.path === "string" ? body.path.trim() : ""

  if (!productId || !rawPath) {
    return NextResponse.json(
      { error: "productId and path required" },
      { status: 400 },
    )
  }

  const headers = request.headers
  const userAgent = headers.get("user-agent")
  const secChUaMobile = headers.get("sec-ch-ua-mobile")
  const secChUa = headers.get("sec-ch-ua")
  const secChUaPlatform = headers.get("sec-ch-ua-platform")

  const device = coerceDevice(inferDeviceCategory(userAgent, secChUaMobile))
  const browser = parseBrowser(userAgent, secChUa)
  const os = parseOs(userAgent, secChUaPlatform)

  const requestGeo =
    (
      request as unknown as {
        geo?: {
          country?: string | null
          region?: string | null
          city?: string | null
        }
      }
    ).geo ?? {}
  const requestIp = (request as unknown as { ip?: string | null }).ip ?? null

  const country =
    headers.get("x-vercel-ip-country") ?? requestGeo.country ?? null
  const region =
    headers.get("x-vercel-ip-country-region") ?? requestGeo.region ?? null
  const decodeNullable = (value: string | null | undefined) => {
    if (!value) return null
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  const city = decodeNullable(
    headers.get("x-vercel-ip-city") ?? requestGeo.city,
  )
  const ip = pickPrimaryIp(headers.get("x-forwarded-for")) ?? requestIp ?? null
  const ipHash = hashIpAddress(ip)

  const path = sanitizePath(rawPath)
  const referrer = sanitizeReferrer(
    typeof body?.referrer === "string" ? body.referrer : undefined,
  )

  const payload = {
    productId,
    path: path ?? rawPath,
    referrer,
    userAgent,
    device,
    browser,
    os,
    country,
    region,
    city,
    ipHash,
  }

  const productExists = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  })

  if (!productExists) {
    console.warn(
      "[analytics] dropping traffic payload for missing product",
      productId,
    )
    return acceptedResponse()
  }

  // Fire-and-forget to avoid blocking the response path.
  trackProductTraffic(payload).catch((err) => {
    console.error("[analytics] failed to queue traffic record", err)
  })

  return acceptedResponse()
}
