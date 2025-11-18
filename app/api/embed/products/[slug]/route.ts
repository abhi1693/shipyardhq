import { NextRequest, NextResponse } from "next/server"

import fs from "fs/promises"
import path from "path"

import { getPublicProductMetaBySlug } from "@/actions/public/products/actions"
import { siteConfig } from "@/lib/siteConfig"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Theme = "light" | "dark"
type Format = "svg" | "png"
type BadgeType = "featured" | "revenue" | "mrr"

type RouteParams = Promise<{ slug: string }>

const WIDTH = 500
const HEIGHT = 162
const OUTER_PADDING = 1
const DEFAULT_THEME: Theme = "light"
const DEFAULT_FORMAT: Format = "svg"
const DEFAULT_TYPE: BadgeType = "featured"

const CACHE_CONTROL =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=600"

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

const TYPE_LABELS: Record<BadgeType, string> = {
  featured: "Featured badge",
  revenue: "Revenue badge",
  mrr: "MRR badge",
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

function buildBaseSvg(options: {
  theme: Theme
  badgeType: BadgeType
  slug: string
  productName: string
  metricValue: string
  productLogo?: string | null
}): string {
  const { theme, badgeType, slug, productName, metricValue, productLogo } =
    options
  const palette = THEME_STYLES[theme]
  const leftWidth = 170
  const logoInitial =
    productName?.trim()?.[0]?.toUpperCase() ||
    slug?.trim()?.[0]?.toUpperCase() ||
    "S"
  const clipId = `logo-clip-${slug}`
  const logoSize = 136
  const logoX = (leftWidth - logoSize) / 2
  const logoY = (HEIGHT - logoSize) / 2
  const rightInset = 20
    const headingSize = 22
  const subheadingSize = 44
  const gap = 38
  const blockHeight = headingSize + gap + subheadingSize
  const contentY = logoY + (logoSize - blockHeight) / 2 + 30
  const headingText =
    badgeType === "featured" ? "Featured On" : "Badge content"
  const subheadingText =
    badgeType === "featured"
      ? siteConfig.name
      : `${badgeType} · slug: ${slug} · metric: ${metricValue}`

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
        productLogo
          ? `<image x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" href="${productLogo}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />`
          : `<rect x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" rx="16" ry="16" fill="${palette.border}" /><text x="${leftWidth / 2}" y="${HEIGHT / 2 + 12}" fill="${palette.text}" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="46" font-weight="900" text-anchor="middle">${logoInitial}</text>`
      }
    </g>
    <g aria-label="Content area" transform="translate(${leftWidth + rightInset}, ${contentY})">
      <text x="0" y="0" fill="${palette.muted}" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${headingSize}" font-weight="800" letter-spacing="1.4">${headingText.toUpperCase()}</text>
      <g transform="translate(0, ${gap})">
        <text x="0" y="0" fill="${palette.text}" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${subheadingSize}" font-weight="900">${subheadingText}</text>
      </g>
    </g>
  </g>
</svg>
`.trim()
}

async function svgToPng(svg: string): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default
    return await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
  } catch (error) {
    console.error("Badge PNG render failed:", error)
    return null
  }
}

async function toDataUri(
  href: string,
  origin: string,
): Promise<string | null> {
  try {
    const url = new URL(href)
    let buf: Buffer | null = null
    let mime = "image/png"

    if (url.origin === origin) {
      const filePath = path.join(process.cwd(), "public", url.pathname)
      buf = await fs.readFile(filePath)
      const ext = path.extname(filePath).toLowerCase()
      if (ext === ".svg") mime = "image/svg+xml"
      else if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg"
      else if (ext === ".webp") mime = "image/webp"
      else if (ext === ".gif") mime = "image/gif"
      else mime = "image/png"
    } else {
      const res = await fetch(href)
      if (!res.ok) return null
      const ab = await res.arrayBuffer()
      buf = Buffer.from(ab)
      mime = res.headers.get("content-type")?.split(";")[0] || mime
    }

    if (!buf) return null
    return `data:${mime};base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}

export async function GET(_req: NextRequest, context: { params: RouteParams }) {
  const { slug } = await context.params
  const url = _req.nextUrl
  const product = await getPublicProductMetaBySlug(slug)
  const productName = product?.name ?? slug
  const theme = parseParam<Theme>(
    url.searchParams.get("theme"),
    ["light", "dark"],
    DEFAULT_THEME,
  )
  const format = parseParam<Format>(
    url.searchParams.get("format"),
    ["svg", "png"],
    DEFAULT_FORMAT,
  )
  const badgeType = parseParam<BadgeType>(
    url.searchParams.get("type"),
    ["featured", "revenue", "mrr"],
    DEFAULT_TYPE,
  )
  const brandLogoPath = theme === "dark" ? "/brand-white.png" : "/brand.png"
  const logoHref =
    badgeType === "featured"
      ? new URL(brandLogoPath, url.origin).toString()
      : product?.logo ?? null
  // Placeholder: swap with real metric formatting (featured/revenue/mrr specific).
  const metricValue = "Coming soon"

  const svg = buildBaseSvg({
    theme,
    badgeType,
    slug,
    productName,
    metricValue,
    productLogo:
      format === "png" && logoHref
        ? (await toDataUri(logoHref, url.origin)) ?? logoHref
        : logoHref,
  })
  const headers = new Headers({ "Cache-Control": CACHE_CONTROL })

  if (format === "svg") {
    headers.set("Content-Type", "image/svg+xml")
    return new NextResponse(svg, { status: 200, headers })
  }

  const png = await svgToPng(svg)
  if (!png) {
    return NextResponse.json(
      { error: "Unable to generate badge preview" },
      { status: 500 },
    )
  }

  headers.set("Content-Type", "image/png")
  const pngArray = new Uint8Array(png)
  return new NextResponse(pngArray, { status: 200, headers })
}
