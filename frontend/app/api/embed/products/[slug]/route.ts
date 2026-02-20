import { NextRequest, NextResponse } from "next/server"

import { readFileSync } from "node:fs"
import path from "node:path"

import {
  getPublicProductMetaBySlugServer,
  getPublicProductRevenueServer,
} from "@/lib/server/generated-public"
import { siteConfig } from "@/lib/siteConfig"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Theme = "light" | "dark"
type BadgeType = "featured" | "revenue"
type Format = "svg" | "png"

type RouteParams = Promise<{ slug: string }>

const WIDTH = 500
const HEIGHT = 162
const OUTER_PADDING = 1
const DEFAULT_THEME: Theme = "light"
const DEFAULT_TYPE: BadgeType = "featured"
const DEFAULT_FORMAT: Format = "svg"
const MAX_INLINE_BYTES = 1_500_000

const CACHE_CONTROL =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=600"

let cachedBrandPathData: string | null = null

function getBrandPathData(): string | null {
  if (cachedBrandPathData) return cachedBrandPathData
  try {
    const filePath = path.join(process.cwd(), "public", "brand.svg")
    const svg = readFileSync(filePath, "utf8")
    const match = svg.match(/<path\s+d="([^"]+)"/)
    if (!match?.[1]) return null
    cachedBrandPathData = match[1]
    return cachedBrandPathData
  } catch {
    return null
  }
}

const THEME_STYLES: Record<
  Theme,
  { card: string; border: string; text: string; muted: string; accent: string }
> = {
  light: {
    card: "#ffffff",
    border: "#e5e7eb",
    text: "#111827",
    muted: "#6b7280",
    accent: "#0f172a",
  },
  dark: {
    card: "#0f172a",
    border: "#1f2937",
    text: "#f9fafb",
    muted: "#9ca3af",
    accent: "#38bdf8",
  },
}

function parseParam<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!value) return fallback
  const normalized = value.toLowerCase()
  return allowed.includes(normalized as T) ? (normalized as T) : fallback
}

const toDataUri = async (
  url: string | null,
  limitBytes = MAX_INLINE_BYTES,
): Promise<string | null> => {
  if (!url) return null

  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
    })

    if (!response.ok) return null

    let contentType = response.headers.get("content-type") || ""
    const arrayBuffer = await response.arrayBuffer()

    // Force Buffer from Uint8Array to avoid ArrayBufferLike generic issues
    let buffer: Buffer = Buffer.from(new Uint8Array(arrayBuffer))

    if (!contentType.startsWith("image/")) {
      return null
    }

    if (!contentType.startsWith("image/png")) {
      const sharp = (await import("sharp")).default
      buffer = await sharp(buffer).png({ compressionLevel: 9 }).toBuffer()
      if (buffer.byteLength > limitBytes) return null
      contentType = "image/png"
    }

    const base64 = buffer.toString("base64")
    return `data:${contentType};base64,${base64}`
  } catch (error) {
    console.warn("[badge] Failed to inline image for badge", { url, error })
    return null
  }
}

function renderBrandMark(options: {
  x: number
  y: number
  size: number
  fill: string
  ariaHidden?: boolean
}): string {
  const { x, y, size, fill, ariaHidden } = options
  const pathData = getBrandPathData()
  if (!pathData) return ""

  return `
<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 1024 1024" ${
    ariaHidden ? 'aria-hidden="true"' : ""
  } xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(0.000000,1024.000000) scale(0.100000,-0.100000)" fill="${fill}" stroke="none">
    <path d="${pathData}"/>
  </g>
</svg>
`.trim()
}

function buildBaseSvg(options: {
  theme: Theme
  badgeType: BadgeType
  format: Format
  slug: string
  productName: string
  metricValue: string
  productLogo?: string | null
}): string {
  const {
    theme,
    badgeType,
    format,
    slug,
    productName,
    metricValue,
    productLogo,
  } = options
  const palette = THEME_STYLES[theme]
  const leftWidth = 170
  const logoFallbackBase =
    badgeType === "featured" ? siteConfig.name : productName
  const logoInitial =
    logoFallbackBase?.trim()?.[0]?.toUpperCase() ||
    slug?.trim()?.[0]?.toUpperCase() ||
    siteConfig.name?.trim()?.[0]?.toUpperCase() ||
    "S"
  const clipId = `logo-clip-${slug}`
  const logoSize = 136
  const logoX = (leftWidth - logoSize) / 2
  const logoY = (HEIGHT - logoSize) / 2
  const rightInset = 20
  const headingSize = 16
  const subheadingSize = 46
  const gap = 26
  const headingText = badgeType === "featured" ? "Featured On" : "Total Revenue"
  const subheadingText =
    badgeType === "featured" ? siteConfig.name : metricValue
  const showVerification = badgeType !== "featured"
  const subtextSize = 14
  const verificationGap = 6
  const blockHeight =
    headingSize +
    gap +
    subheadingSize +
    (showVerification ? verificationGap + subtextSize : 0)
  const contentY = logoY + (logoSize - blockHeight) / 2

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH + OUTER_PADDING * 2}" height="${HEIGHT + OUTER_PADDING * 2}" role="img" aria-label="Shipyard badge placeholder">
  <defs>
    <clipPath id="${clipId}">
      <rect x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" rx="16" ry="16" />
    </clipPath>
  </defs>
  <g transform="translate(${OUTER_PADDING}, ${OUTER_PADDING})">
		    <rect x="0" y="0" rx="12" ry="12" width="${WIDTH}" height="${HEIGHT}" fill="${palette.card}" stroke="${palette.border}" stroke-width="2" />
		    <g aria-label="Logo area">
		      ${
            (badgeType === "featured" || badgeType === "revenue") &&
            format === "svg"
              ? renderBrandMark({
                  x: logoX + 10,
                  y: logoY + 10,
                  size: logoSize - 20,
                  fill: palette.accent,
                  ariaHidden: true,
                })
              : productLogo && format === "png"
                ? `<image x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" href="${productLogo}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />`
                : `<rect x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" rx="16" ry="16" fill="${palette.border}" /><text x="${leftWidth / 2}" y="${HEIGHT / 2 + 12}" fill="${palette.text}" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="46" font-weight="900" text-anchor="middle">${logoInitial}</text>`
          }
		    </g>
    <g aria-label="Content area" transform="translate(${leftWidth + rightInset}, ${contentY})">
      <text x="0" y="0" fill="${palette.muted}" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${headingSize}" font-weight="600" letter-spacing="1.4" dominant-baseline="hanging">${headingText.toUpperCase()}</text>
      <g transform="translate(0, ${gap})">
        <text x="0" y="0" fill="${palette.text}" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${subheadingSize}" font-weight="900" dominant-baseline="hanging">${subheadingText}</text>
		        ${
              showVerification
                ? `<g transform="translate(0, ${subheadingSize + verificationGap})" aria-label="Verification text">
		              <text x="0" y="0" fill="${palette.muted}" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${subtextSize}" font-weight="600" dominant-baseline="hanging">Verified by ${siteConfig.name}</text>
		            </g>`
                : ""
            }
	      </g>
    </g>
  </g>
</svg>
`.trim()
}

async function resolveHref(
  href: string | null | undefined,
  origin: string,
  format: Format,
): Promise<string | null> {
  if (!href) return null

  const url =
    href.startsWith("http://") || href.startsWith("https://")
      ? new URL(href)
      : new URL(href, origin)

  if (format === "svg") {
    // For SVG we just return a plain URL, no need to inline
    return url.toString()
  }

  // For PNG badges we inline the image as a data URI
  return await toDataUri(url.toString())
}

export async function GET(_req: NextRequest, context: { params: RouteParams }) {
  const { slug } = await context.params
  const url = _req.nextUrl
  const product = await getPublicProductMetaBySlugServer(slug)
  if (!product) {
    return new NextResponse("Badge not found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    })
  }
  const productName = product?.name ?? slug
  const theme = parseParam<Theme>(
    url.searchParams.get("theme"),
    ["light", "dark"],
    DEFAULT_THEME,
  )
  const badgeType = parseParam<BadgeType>(
    url.searchParams.get("type"),
    ["featured", "revenue"],
    DEFAULT_TYPE,
  )
  const format = parseParam<Format>(
    url.searchParams.get("format"),
    ["svg", "png"],
    DEFAULT_FORMAT,
  )
  const brandLogoPath = theme === "dark" ? "/brand-white.png" : "/brand.png"
  const brandLogoHref =
    format === "png"
      ? await resolveHref(brandLogoPath, url.origin, format)
      : null
  const isFeatured = badgeType === "featured"
  let metricValue = "$0"

  if (!isFeatured && product?.id) {
    const revenue = await getPublicProductRevenueServer(product.id)
    const currencyCode = revenue?.currencyCode ?? "USD"

    const formatCurrency = (cents: number | null | undefined) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }).format((cents ?? 0) / 100)

    metricValue = formatCurrency(revenue?.latestAllTimeRevenueCents)
  }

  const svg = buildBaseSvg({
    theme,
    badgeType,
    format,
    slug,
    productName,
    metricValue,
    productLogo: brandLogoHref,
  })

  if (format === "png") {
    try {
      const sharp = (await import("sharp")).default
      const pngBuffer = await sharp(Buffer.from(svg))
        .png({
          compressionLevel: 9,
        })
        .toBuffer()
      const pngArray = new Uint8Array(pngBuffer)
      const pngHeaders = new Headers({
        "Cache-Control": CACHE_CONTROL,
        "Content-Type": "image/png",
        "Content-Length": `${pngArray.byteLength}`,
      })
      return new NextResponse(pngArray, { status: 200, headers: pngHeaders })
    } catch (err) {
      console.error("[badge] Failed to render PNG badge, falling back to SVG", {
        error: err,
        slug,
        badgeType,
        theme,
      })
    }
  }

  const headers = new Headers({
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": "image/svg+xml",
  })

  return new NextResponse(svg, { status: 200, headers })
}
