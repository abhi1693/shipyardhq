import { NextRequest, NextResponse } from "next/server"

import { readFileSync } from "node:fs"
import path from "node:path"

import { getPublicProductMetaBySlug } from "@/actions/public/products/actions"
import { siteConfig } from "@/lib/siteConfig"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Theme = "light" | "dark"
type BadgeType = "featured"

type RouteContext = {
  params: Promise<{ slug: string }>
}

const WIDTH = 500
const HEIGHT = 162
const OUTER_PADDING = 1
const DEFAULT_THEME: Theme = "light"
const DEFAULT_TYPE: BadgeType = "featured"

const CACHE_CONTROL =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=600"
const BADGE_FONT_FAMILY =
  "'ShipyardBadge', 'DejaVu Sans', Arial, Helvetica, sans-serif"

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
  slug: string
  productName: string
}): string {
  const { theme, badgeType, slug, productName } = options
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
  const contentClipId = `content-clip-${slug}`
  const logoSize = 136
  const logoX = (leftWidth - logoSize) / 2
  const logoY = (HEIGHT - logoSize) / 2
  const rightInset = 20
  const contentX = leftWidth + rightInset
  const contentMaxWidth = WIDTH - contentX - 20
  const headingSize = 16
  const subheadingSize = 42
  const gap = 26
  const headingText = "Featured On"
  const subheadingText = siteConfig.name
  const showVerification = false
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
    <clipPath id="${contentClipId}">
      <rect x="${contentX}" y="0" width="${contentMaxWidth}" height="${HEIGHT}" />
    </clipPath>
  </defs>
  <g transform="translate(${OUTER_PADDING}, ${OUTER_PADDING})">
		    <rect x="0" y="0" rx="12" ry="12" width="${WIDTH}" height="${HEIGHT}" fill="${palette.card}" stroke="${palette.border}" stroke-width="2" />
		    <g aria-label="Logo area">
		      ${
            badgeType === "featured"
              ? renderBrandMark({
                  x: logoX + 10,
                  y: logoY + 10,
                  size: logoSize - 20,
                  fill: palette.accent,
                  ariaHidden: true,
                })
              : `<rect x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" rx="16" ry="16" fill="${palette.border}" /><text x="${leftWidth / 2}" y="${HEIGHT / 2 + 12}" fill="${palette.text}" font-family="${BADGE_FONT_FAMILY}" font-size="46" font-weight="900" text-anchor="middle">${logoInitial}</text>`
          }
		    </g>
    <g aria-label="Content area" clip-path="url(#${contentClipId})">
      <text x="${contentX}" y="${contentY}" fill="${palette.muted}" font-family="${BADGE_FONT_FAMILY}" font-size="${headingSize}" font-weight="600" letter-spacing="1.4" dominant-baseline="hanging">${headingText.toUpperCase()}</text>
      <g transform="translate(${contentX}, ${contentY + gap})">
        <text x="0" y="0" fill="${palette.text}" font-family="${BADGE_FONT_FAMILY}" font-size="${subheadingSize}" font-weight="900" dominant-baseline="hanging" textLength="${contentMaxWidth}" lengthAdjust="spacingAndGlyphs">${subheadingText}</text>
		        ${
              showVerification
                ? `<g transform="translate(0, ${subheadingSize + verificationGap})" aria-label="Verification text">
		              <text x="0" y="0" fill="${palette.muted}" font-family="${BADGE_FONT_FAMILY}" font-size="${subtextSize}" font-weight="600" dominant-baseline="hanging">Verified by ${siteConfig.name}</text>
		            </g>`
                : ""
            }
	      </g>
    </g>
  </g>
</svg>
`.trim()
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const url = _req.nextUrl
  const product = await getPublicProductMetaBySlug(slug)
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
    ["featured"],
    DEFAULT_TYPE,
  )

  const svg = buildBaseSvg({
    theme,
    badgeType,
    slug,
    productName,
  })

  const headers = new Headers({
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": "image/svg+xml",
  })

  return new NextResponse(svg, { status: 200, headers })
}
