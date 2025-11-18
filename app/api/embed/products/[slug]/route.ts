import { NextRequest, NextResponse } from "next/server"

import {
  getPublicProductMetaBySlug,
  getPublicProductRevenue,
} from "@/actions/public/products/actions"
import { siteConfig } from "@/lib/siteConfig"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Theme = "light" | "dark"
type BadgeType = "featured" | "revenue" | "mrr"

type RouteParams = Promise<{ slug: string }>

const WIDTH = 500
const HEIGHT = 162
const OUTER_PADDING = 1
const DEFAULT_THEME: Theme = "light"
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
  brandLogo?: string | null
}): string {
  const {
    theme,
    badgeType,
    slug,
    productName,
    metricValue,
    productLogo,
    brandLogo,
  } = options
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
  const headingSize = 16
  const subheadingSize = 46
  const gap = 26
  const headingText =
    badgeType === "featured"
      ? "Featured On"
      : badgeType === "revenue"
        ? "Total Revenue"
        : "MRR"
  const subheadingText =
    badgeType === "featured"
      ? siteConfig.name
      : badgeType === "revenue"
        ? metricValue
        : metricValue
  const showVerification = badgeType !== "featured" && !!brandLogo
  const verifiedLogoSize = 20
  const subtextSize = 14
  const verificationGap = 6
  const verificationTextY = (verifiedLogoSize - subtextSize) / 2
  const blockHeight =
    headingSize + gap + subheadingSize + (showVerification ? verificationGap + subtextSize : 0)
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
        productLogo
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
              <image x="0" y="0" width="${verifiedLogoSize}" height="${verifiedLogoSize}" href="${brandLogo}" preserveAspectRatio="xMidYMid slice" />
              <text x="${verifiedLogoSize + 8}" y="${verificationTextY}" fill="${palette.muted}" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${subtextSize}" font-weight="600" dominant-baseline="hanging">Verified by ${siteConfig.name}</text>
            </g>`
            : ""
        }
      </g>
    </g>
  </g>
</svg>
`.trim()
}

function resolveHref(href: string | null | undefined, origin: string): string | null {
  if (!href) return null
  try {
    return new URL(href).toString()
  } catch {
    try {
      return new URL(href, origin).toString()
    } catch {
      return null
    }
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
  const badgeType = parseParam<BadgeType>(
    url.searchParams.get("type"),
    ["featured", "revenue", "mrr"],
    DEFAULT_TYPE,
  )
  const brandLogoPath = theme === "dark" ? "/brand-white.png" : "/brand.png"
  const brandLogoHref = resolveHref(brandLogoPath, url.origin)
  const isFeatured = badgeType === "featured"
  const productLogoHref = resolveHref(product?.logo ?? null, url.origin)
  const logoHref = isFeatured ? brandLogoHref : productLogoHref
  let metricValue = "$0"

  if (!isFeatured && product?.id) {
    const revenue = await getPublicProductRevenue(product.id)
    const currencyCode = revenue?.currencyCode ?? "USD"

    const formatCurrency = (cents: number | null | undefined) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }).format((cents ?? 0) / 100)

    if (badgeType === "revenue") {
      metricValue = formatCurrency(revenue?.latestAllTimeRevenueCents)
    } else if (badgeType === "mrr") {
      metricValue = formatCurrency(revenue?.latestMrrCents)
    }
  }

  const svg = buildBaseSvg({
    theme,
    badgeType,
    slug,
    productName,
    metricValue,
    productLogo: logoHref,
    brandLogo: brandLogoHref ?? undefined,
  })

  const headers = new Headers({
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": "image/svg+xml",
  })

  return new NextResponse(svg, { status: 200, headers })
}
