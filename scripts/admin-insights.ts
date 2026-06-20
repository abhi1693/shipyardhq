#!/usr/bin/env tsx

import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"

const SECTION_NAMES = [
  "overview",
  "growth",
  "products",
  "drafts",
  "traffic",
  "revenue",
  "operations",
] as const

type SectionName = (typeof SECTION_NAMES)[number]

type CliOptions = {
  allDrafts: boolean
  days: number
  help: boolean
  json: boolean
  limit: number
  sections: SectionName[]
}

type TableRow = Record<string, string | number | null>

type WindowTotals = {
  current: number
  previous: number
}

type Align = "left" | "right"
type Tone = "bad" | "good" | "info" | "muted" | "normal" | "warn"

type MetricCard = {
  detail?: string
  label: string
  tone?: Tone
  value: string
}

type TableColumn<T extends Record<string, unknown>> = {
  align?: Align
  format?: (value: unknown, row: T) => string
  key: keyof T | string
  label: string
  maxWidth?: number
  minWidth?: number
  width?: number
}

const DEFAULT_DAYS = 7
const DEFAULT_LIMIT = 8
const MS_PER_DAY = 24 * 60 * 60 * 1000
const MAX_RENDER_WIDTH = 132
const numberFormatter = new Intl.NumberFormat("en-US")
const useColor =
  Boolean(process.stdout.isTTY) &&
  !process.env.NO_COLOR &&
  process.env.TERM !== "dumb"

const styles = {
  bad: "\u001b[31m",
  bold: "\u001b[1m",
  cyan: "\u001b[36m",
  dim: "\u001b[2m",
  good: "\u001b[32m",
  reset: "\u001b[0m",
  warn: "\u001b[33m",
}

const ansiPattern = /\u001b\[[0-9;]*m/g

function printUsage() {
  console.log(`Usage:
  npm run admin:insights -- [options]

Options:
  --days <n>             Rolling window in days. Default: ${DEFAULT_DAYS}.
  --limit <n>            Rows per ranked table. Default: ${DEFAULT_LIMIT}.
  --all-drafts           Show every product draft when --section drafts is used.
  --section <names>      Comma-separated sections: ${SECTION_NAMES.join(", ")}.
  --json                 Print machine-readable JSON.
  --help                 Show this help.

Examples:
  npm run admin:insights
  npm run admin:insights -- --days 30 --limit 12
  npm run admin:insights -- --section drafts --all-drafts
  npm run admin:insights -- --section traffic,operations
  npm run --silent admin:insights -- --json --days 14
`)
}

function readPositiveInteger(raw: string | undefined, label: string) {
  if (!raw) throw new Error(`Missing value for ${label}`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`)
  }
  return value
}

function parseSections(raw: string | undefined): SectionName[] {
  if (!raw) throw new Error("Missing value for --section")

  const names = raw
    .split(",")
    .map((section) => section.trim())
    .filter(Boolean)

  if (!names.length) throw new Error("--section must include at least one name")

  const invalid = names.filter(
    (name): name is string => !SECTION_NAMES.includes(name as SectionName),
  )
  if (invalid.length) {
    throw new Error(
      `Unknown section: ${invalid.join(", ")}. Valid sections: ${SECTION_NAMES.join(", ")}`,
    )
  }

  return Array.from(new Set(names as SectionName[]))
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    allDrafts: false,
    days: DEFAULT_DAYS,
    help: false,
    json: false,
    limit: DEFAULT_LIMIT,
    sections: [...SECTION_NAMES],
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    switch (arg) {
      case "--days":
        options.days = readPositiveInteger(argv[++index], "--days")
        break
      case "--limit":
        options.limit = readPositiveInteger(argv[++index], "--limit")
        break
      case "--all-drafts":
        options.allDrafts = true
        break
      case "--section":
      case "--sections":
        options.sections = parseSections(argv[++index])
        break
      case "--json":
        options.json = true
        break
      case "--help":
      case "-h":
        options.help = true
        break
      default:
        throw new Error(`Unknown option: ${arg}`)
    }
  }

  return options
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * MS_PER_DAY)
}

function formatNumber(value: number | null | undefined) {
  return numberFormatter.format(value ?? 0)
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "n/a"
  }

  const percent = Math.abs(value) <= 1 ? value * 100 : value
  return `${percent.toFixed(1)}%`
}

function formatChange({ current, previous }: WindowTotals) {
  if (previous === 0) return current === 0 ? "0.0%" : "new"
  const change = ((current - previous) / previous) * 100
  const prefix = change > 0 ? "+" : ""
  return `${prefix}${change.toFixed(1)}%`
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString().replace("T", " ").slice(0, 19) : "n/a"
}

function payloadRecord(payload: Prisma.JsonValue): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {}
  }

  return payload as Record<string, unknown>
}

function payloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === "string" ? value.trim() : ""
}

function payloadStringArray(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  if (!Array.isArray(value)) return []

  return value.filter((item): item is string => typeof item === "string")
}

function formatAgeDays(value: Date) {
  const days = Math.floor((Date.now() - value.getTime()) / MS_PER_DAY)
  return `${formatNumber(Math.max(0, days))}d`
}

function formatDurationMs(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "n/a"
  }
  if (value < 1000) return `${Math.round(value)}ms`
  const seconds = value / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  return `${(seconds / 60).toFixed(1)}m`
}

function formatCurrency(cents: number | null | undefined, currency = "USD") {
  const value = (cents ?? 0) / 100
  return new Intl.NumberFormat("en-US", {
    currency,
    style: "currency",
  }).format(value)
}

function summarizeWindow(current: number, previous: number): TableRow {
  return {
    current: formatNumber(current),
    previous: formatNumber(previous),
    change: formatChange({ current, previous }),
  }
}

function sectionEnabled(options: CliOptions, section: SectionName) {
  return options.sections.includes(section)
}

function terminalWidth() {
  return Math.min(MAX_RENDER_WIDTH, Math.max(88, process.stdout.columns ?? 108))
}

function paint(value: string, tone: Tone | "bold" = "normal") {
  if (!useColor || tone === "normal") return value

  const style =
    tone === "good"
      ? styles.good
      : tone === "warn"
        ? styles.warn
        : tone === "bad"
          ? styles.bad
          : tone === "info"
            ? styles.cyan
            : tone === "muted"
              ? styles.dim
              : styles.bold

  return `${style}${value}${styles.reset}`
}

function visibleLength(value: string) {
  return value.replace(ansiPattern, "").length
}

function toDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "n/a"
  if (typeof value === "number") return formatNumber(value)
  if (typeof value === "bigint") return formatNumber(Number(value))
  return String(value)
}

function truncate(value: string, width: number) {
  if (visibleLength(value) <= width) return value

  const plain = value.replace(ansiPattern, "")
  if (width <= 3) return plain.slice(0, width)
  return `${plain.slice(0, width - 3)}...`
}

function pad(value: string, width: number, align: Align = "left") {
  const visible = visibleLength(value)
  if (visible >= width) return value

  const padding = " ".repeat(width - visible)
  return align === "right" ? `${padding}${value}` : `${value}${padding}`
}

function titleize(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function rule(character = "-") {
  return character.repeat(terminalWidth())
}

function sectionTitle(title: string) {
  console.log("")
  console.log(paint(title.toUpperCase(), "bold"))
  console.log(paint(rule("-"), "muted"))
}

function subsectionTitle(title: string) {
  console.log("")
  console.log(paint(title, "bold"))
}

function chunkArray<T>(values: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function cardLine(value: string, width: number, align: Align = "left") {
  const innerWidth = width - 4
  return `| ${pad(truncate(value, innerWidth), innerWidth, align)} |`
}

function renderMetricCards(title: string, cards: MetricCard[]) {
  if (!cards.length) return

  sectionTitle(title)

  const gap = 2
  const width = terminalWidth()
  const columns = Math.min(4, Math.max(1, Math.floor((width + gap) / 28)))
  const cardWidth = Math.floor((width - gap * (columns - 1)) / columns)
  const border = `+${"-".repeat(cardWidth - 2)}+`

  for (const group of chunkArray(cards, columns)) {
    console.log(group.map(() => border).join(" ".repeat(gap)))
    console.log(
      group
        .map((card) => cardLine(paint(card.label, "muted"), cardWidth))
        .join(" ".repeat(gap)),
    )
    console.log(
      group
        .map((card) => cardLine(paint(card.value, card.tone), cardWidth))
        .join(" ".repeat(gap)),
    )
    console.log(
      group
        .map((card) =>
          cardLine(card.detail ? paint(card.detail, "muted") : "", cardWidth),
        )
        .join(" ".repeat(gap)),
    )
    console.log(group.map(() => border).join(" ".repeat(gap)))
  }
}

function renderTable<T extends Record<string, unknown>>(
  title: string,
  rows: T[],
  columns: TableColumn<T>[],
) {
  subsectionTitle(title)

  if (!rows.length) {
    console.log(paint("No data", "muted"))
    return
  }

  const widths = columns.map((column) => {
    const minWidth = column.minWidth ?? Math.min(column.label.length, 10)
    const maxWidth = column.maxWidth ?? (column.align === "right" ? 16 : 34)
    const values = rows.map((row) => renderCell(row, column))
    const contentWidth = Math.max(
      visibleLength(column.label),
      ...values.map(visibleLength),
    )

    return Math.max(minWidth, Math.min(column.width ?? contentWidth, maxWidth))
  })

  let tableWidth = widths.reduce((total, width) => total + width, 0)
  tableWidth += (columns.length - 1) * 2

  while (tableWidth > terminalWidth()) {
    const widestIndex = widths.reduce((widest, width, index) => {
      const currentMin = columns[index].minWidth ?? 8
      const widestMin = columns[widest].minWidth ?? 8
      if (width <= currentMin) return widest
      if (width > widths[widest] && widths[widest] > widestMin) return index
      return widest
    }, 0)

    const minWidth = columns[widestIndex].minWidth ?? 8
    if (widths[widestIndex] <= minWidth) break

    widths[widestIndex] -= 1
    tableWidth -= 1
  }

  const header = columns
    .map((column, index) =>
      pad(truncate(column.label, widths[index]), widths[index], column.align),
    )
    .join("  ")
  console.log(paint(header, "bold"))
  console.log(paint("-".repeat(visibleLength(header)), "muted"))

  for (const row of rows) {
    console.log(
      columns
        .map((column, index) =>
          pad(
            truncate(renderCell(row, column), widths[index]),
            widths[index],
            column.align,
          ),
        )
        .join("  "),
    )
  }
}

function renderCell<T extends Record<string, unknown>>(
  row: T,
  column: TableColumn<T>,
) {
  const value = row[String(column.key)]
  return column.format ? column.format(value, row) : toDisplayValue(value)
}

function renderHealthList(
  title: string,
  items: Array<{
    detail?: string
    label: string
    tone?: Tone
    value: string
  }>,
) {
  subsectionTitle(title)

  for (const item of items) {
    const badge =
      item.tone === "bad"
        ? paint("[FAIL]", "bad")
        : item.tone === "warn"
          ? paint("[WARN]", "warn")
          : item.tone === "info"
            ? paint("[INFO]", "info")
            : paint("[ OK ]", "good")

    const detail = item.detail ? paint(` - ${item.detail}`, "muted") : ""
    console.log(
      `${badge} ${item.label}: ${paint(item.value, item.tone)}${detail}`,
    )
  }
}

function rankRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row, index) => ({ rank: index + 1, ...row }))
}

function maxByKey(rows: Array<Record<string, unknown>>, key: string) {
  return Math.max(
    0,
    ...rows.map((row) => {
      const value = row[key]
      return typeof value === "number" ? value : Number(value) || 0
    }),
  )
}

function bar(value: unknown, max: number, width = 14) {
  const numeric = typeof value === "number" ? value : Number(value) || 0
  const filled = max > 0 ? Math.round((numeric / max) * width) : 0
  const safeFilled = Math.max(0, Math.min(width, filled))
  const meter = `${"#".repeat(safeFilled)}${".".repeat(width - safeFilled)}`
  return `[${paint(meter, safeFilled > 0 ? "info" : "muted")}]`
}

function changeCell(value: unknown) {
  const text = toDisplayValue(value)
  if (text === "new") return paint(text, "info")
  if (text.startsWith("+")) return paint(text, "good")
  if (text.startsWith("-")) return paint(text, "bad")
  return paint(text, "muted")
}

function statusCell(value: unknown) {
  const text = toDisplayValue(value)
  const tone = statusTone(text)

  return tone === "normal" ? text : paint(text, tone)
}

function statusTone(value: unknown): Tone {
  const text = toDisplayValue(value)
  const normalized = text.toLowerCase()

  if (/(error|fail|expired|cancel)/.test(normalized)) {
    return "bad"
  }
  if (/(pending|retry|processing|draft|paused|queued)/.test(normalized)) {
    return "warn"
  }
  if (
    /(active|published|success|succeeded|verified|complete)/.test(normalized)
  ) {
    return "good"
  }

  return "normal"
}

function header(report: Record<string, any>, options: CliOptions) {
  console.log("")
  console.log(paint("SHIPYARD ADMIN INSIGHTS", "bold"))
  console.log(
    paint(
      [
        `Generated ${formatDate(new Date(report.generatedAt))}`,
        `Window last ${options.days} day${options.days === 1 ? "" : "s"}`,
        `Sections ${options.sections.join(", ")}`,
      ].join(" | "),
      "muted",
    ),
  )
  console.log(paint(rule("="), "info"))
}

async function getWindowCounts(args: {
  currentStart: Date
  previousStart: Date
  previousEnd: Date
}) {
  const { currentStart, previousStart, previousEnd } = args

  const [
    newUsers,
    previousUsers,
    newProducts,
    previousProducts,
    publishedProducts,
    previousPublishedProducts,
    drafts,
    previousDrafts,
    upvotes,
    previousUpvotes,
    purchases,
    previousPurchases,
    currentSiteTraffic,
    previousSiteTraffic,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: currentStart } } }),
    prisma.user.count({
      where: { createdAt: { gte: previousStart, lt: previousEnd } },
    }),
    prisma.product.count({ where: { createdAt: { gte: currentStart } } }),
    prisma.product.count({
      where: { createdAt: { gte: previousStart, lt: previousEnd } },
    }),
    prisma.product.count({ where: { publishedAt: { gte: currentStart } } }),
    prisma.product.count({
      where: { publishedAt: { gte: previousStart, lt: previousEnd } },
    }),
    prisma.productDraft.count({ where: { createdAt: { gte: currentStart } } }),
    prisma.productDraft.count({
      where: { createdAt: { gte: previousStart, lt: previousEnd } },
    }),
    prisma.productUpvote.count({ where: { createdAt: { gte: currentStart } } }),
    prisma.productUpvote.count({
      where: { createdAt: { gte: previousStart, lt: previousEnd } },
    }),
    prisma.userPlanPurchase.count({
      where: { createdAt: { gte: currentStart } },
    }),
    prisma.userPlanPurchase.count({
      where: { createdAt: { gte: previousStart, lt: previousEnd } },
    }),
    prisma.siteTrafficDaily.aggregate({
      _sum: { pageViews: true, uniqueVisitors: true, sessions: true },
      where: { date: { gte: currentStart } },
    }),
    prisma.siteTrafficDaily.aggregate({
      _sum: { pageViews: true, uniqueVisitors: true, sessions: true },
      where: { date: { gte: previousStart, lt: previousEnd } },
    }),
  ])

  return {
    drafts: summarizeWindow(drafts, previousDrafts),
    newProducts: summarizeWindow(newProducts, previousProducts),
    newUsers: summarizeWindow(newUsers, previousUsers),
    publishedProducts: summarizeWindow(
      publishedProducts,
      previousPublishedProducts,
    ),
    purchases: summarizeWindow(purchases, previousPurchases),
    sessions: summarizeWindow(
      currentSiteTraffic._sum.sessions ?? 0,
      previousSiteTraffic._sum.sessions ?? 0,
    ),
    sitePageViews: summarizeWindow(
      currentSiteTraffic._sum.pageViews ?? 0,
      previousSiteTraffic._sum.pageViews ?? 0,
    ),
    siteVisitors: summarizeWindow(
      currentSiteTraffic._sum.uniqueVisitors ?? 0,
      previousSiteTraffic._sum.uniqueVisitors ?? 0,
    ),
    upvotes: summarizeWindow(upvotes, previousUpvotes),
  }
}

async function getOverview(currentStart: Date) {
  const [
    totalUsers,
    activeUsers,
    totalProducts,
    publishedProducts,
    drafts,
    categories,
    useCases,
    siteTraffic,
    productTraffic,
    latestIngestion,
    dbSizeRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "active" } }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "published" } }),
    prisma.productDraft.count(),
    prisma.category.count(),
    prisma.useCase.count(),
    prisma.siteTrafficDaily.aggregate({
      _avg: { bounceRate: true, engagementRate: true },
      _sum: { pageViews: true, sessions: true, uniqueVisitors: true },
      where: { date: { gte: currentStart } },
    }),
    prisma.productTrafficDaily.aggregate({
      _sum: { pageViews: true, uniqueVisitors: true },
      where: { date: { gte: currentStart } },
    }),
    prisma.analyticsIngestionRun.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        error: true,
        finishedAt: true,
        job: true,
        startedAt: true,
        status: true,
      },
    }),
    prisma.$queryRaw<Array<{ bytes: bigint }>>(
      Prisma.sql`SELECT pg_database_size(current_database()) AS bytes`,
    ),
  ])

  const ingestionDuration =
    latestIngestion?.startedAt && latestIngestion.finishedAt
      ? latestIngestion.finishedAt.getTime() -
        latestIngestion.startedAt.getTime()
      : null

  const dbBytes = dbSizeRows[0]?.bytes ? Number(dbSizeRows[0].bytes) : 0

  return {
    activeUsers,
    categories,
    dbSizeMb: Math.round(dbBytes / 1024 / 1024),
    drafts,
    latestIngestion: latestIngestion
      ? {
          duration: formatDurationMs(ingestionDuration),
          error: latestIngestion.error,
          finishedAt: formatDate(latestIngestion.finishedAt),
          job: latestIngestion.job,
          status: latestIngestion.status,
        }
      : null,
    productPageViews: productTraffic._sum.pageViews ?? 0,
    productVisitors: productTraffic._sum.uniqueVisitors ?? 0,
    publishedProducts,
    siteBounceRate: formatPercent(siteTraffic._avg.bounceRate),
    siteEngagementRate: formatPercent(siteTraffic._avg.engagementRate),
    sitePageViews: siteTraffic._sum.pageViews ?? 0,
    siteSessions: siteTraffic._sum.sessions ?? 0,
    siteVisitors: siteTraffic._sum.uniqueVisitors ?? 0,
    totalProducts,
    totalUsers,
    useCases,
  }
}

async function getProductInsights(limit: number) {
  const [
    byStatus,
    byType,
    byPricing,
    topCategories,
    topProducts,
    verifications,
    missingAnalytics,
    staleDrafts,
    platforms,
  ] = await Promise.all([
    prisma.product.groupBy({
      _count: { _all: true },
      by: ["status"],
      orderBy: { status: "asc" },
    }),
    prisma.product.groupBy({
      _count: { _all: true },
      by: ["type"],
      orderBy: { _count: { type: "desc" } },
    }),
    prisma.product.groupBy({
      _count: { _all: true },
      by: ["pricingModel"],
      orderBy: { _count: { pricingModel: "desc" } },
    }),
    prisma.category.findMany({
      orderBy: { productAssignments: { _count: "desc" } },
      select: {
        name: true,
        slug: true,
        _count: { select: { productAssignments: true } },
      },
      take: limit,
      where: { productAssignments: { some: {} } },
    }),
    prisma.product.findMany({
      orderBy: [{ analytics: { upvotes: "desc" } }, { createdAt: "desc" }],
      select: {
        analytics: { select: { upvotes: true } },
        category: { select: { name: true } },
        createdAt: true,
        name: true,
        slug: true,
        status: true,
      },
      take: limit,
      where: { status: "published" },
    }),
    prisma.productVerification.count({ where: { isVerified: true } }),
    prisma.product.count({ where: { analytics: null } }),
    prisma.productDraft.count({ where: { updatedAt: { lt: daysAgo(14) } } }),
    prisma.$queryRaw<Array<{ count: bigint; platform: string }>>(Prisma.sql`
      SELECT platform::text AS platform, COUNT(*) AS count
      FROM "Product", UNNEST("platforms") AS platform
      WHERE "status" = 'published'
      GROUP BY platform
      ORDER BY count DESC, platform ASC
      LIMIT ${limit}
    `),
  ])

  return {
    byPricing: byPricing.map((row) => ({
      count: row._count._all,
      pricingModel: row.pricingModel,
    })),
    byStatus: byStatus.map((row) => ({
      count: row._count._all,
      status: row.status,
    })),
    byType: byType.map((row) => ({ count: row._count._all, type: row.type })),
    missingAnalytics,
    platforms: platforms.map((row) => ({
      count: Number(row.count),
      platform: row.platform,
    })),
    staleDrafts,
    topCategories: topCategories.map((category) => ({
      category: category.name,
      count: category._count.productAssignments,
      slug: category.slug,
    })),
    topProducts: topProducts.map((product) => ({
      category: product.category.name,
      createdAt: formatDate(product.createdAt),
      name: product.name,
      slug: product.slug,
      status: product.status,
      upvotes: product.analytics?.upvotes ?? 0,
    })),
    verifiedProducts: verifications,
  }
}

async function getDraftInsights(limit: number | null) {
  const take = limit ?? undefined
  const [total, staleDrafts, byStep, byMode, drafts] = await Promise.all([
    prisma.productDraft.count(),
    prisma.productDraft.count({ where: { updatedAt: { lt: daysAgo(14) } } }),
    prisma.productDraft.groupBy({
      _count: { _all: true },
      by: ["currentStep"],
      orderBy: { _count: { currentStep: "desc" } },
    }),
    prisma.productDraft.groupBy({
      _count: { _all: true },
      by: ["mode"],
      orderBy: { _count: { mode: "desc" } },
    }),
    prisma.productDraft.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        createdAt: true,
        currentStep: true,
        id: true,
        mode: true,
        payload: true,
        productId: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
            firstName: true,
            id: true,
            lastName: true,
            status: true,
          },
        },
        userId: true,
      },
      take,
    }),
  ])

  return {
    allShown: limit === null,
    byMode: byMode.map((row) => ({
      count: row._count._all,
      mode: row.mode,
    })),
    byStep: byStep.map((row) => ({
      count: row._count._all,
      step: row.currentStep,
    })),
    drafts: drafts.map((draft) => {
      const payload = payloadRecord(draft.payload)
      const categoryCount =
        payloadStringArray(payload, "categoryIds").length ||
        (payloadString(payload, "categoryId") ? 1 : 0)
      const ownerName = [draft.user.firstName, draft.user.lastName]
        .filter(Boolean)
        .join(" ")

      return {
        age: formatAgeDays(draft.updatedAt),
        categories: categoryCount,
        createdAt: formatDate(draft.createdAt),
        draftId: draft.id,
        galleryItems: payloadStringArray(payload, "galleryMedia").length,
        hasBanner: Boolean(payloadString(payload, "bannerImage")),
        hasLogo: Boolean(payloadString(payload, "logo")),
        mode: draft.mode,
        owner: draft.user.email,
        ownerName,
        ownerStatus: draft.user.status,
        pricingModel: payloadString(payload, "pricingModel"),
        productId: draft.productId,
        productName: payloadString(payload, "name") || "(untitled)",
        step: draft.currentStep,
        type: payloadString(payload, "type"),
        updatedAt: formatDate(draft.updatedAt),
        userId: draft.userId,
        websiteUrl: payloadString(payload, "websiteUrl"),
      }
    }),
    showing: drafts.length,
    staleDrafts,
    total,
  }
}

async function getTrafficInsights(
  currentStart: Date,
  previousStart: Date,
  limit: number,
) {
  const [siteCurrent, sitePrevious, productCurrent, topProducts, topReferrers] =
    await Promise.all([
      prisma.siteTrafficDaily.aggregate({
        _avg: {
          averageSessionDuration: true,
          bounceRate: true,
          engagementRate: true,
          pagesPerSession: true,
        },
        _sum: { pageViews: true, sessions: true, uniqueVisitors: true },
        where: { date: { gte: currentStart } },
      }),
      prisma.siteTrafficDaily.aggregate({
        _sum: { pageViews: true, sessions: true, uniqueVisitors: true },
        where: { date: { gte: previousStart, lt: currentStart } },
      }),
      prisma.productTrafficDaily.aggregate({
        _sum: { pageViews: true, uniqueVisitors: true },
        where: { date: { gte: currentStart } },
      }),
      prisma.productTrafficDaily.groupBy({
        _sum: { pageViews: true, uniqueVisitors: true },
        by: ["productId"],
        orderBy: { _sum: { pageViews: "desc" } },
        take: limit,
        where: { date: { gte: currentStart } },
      }),
      prisma.siteTrafficReferrerDaily.groupBy({
        _sum: { pageViews: true },
        by: ["referrer"],
        orderBy: { _sum: { pageViews: "desc" } },
        take: limit,
        where: { date: { gte: currentStart } },
      }),
    ])

  const productIds = topProducts.map((row) => row.productId)
  const productNames = productIds.length
    ? await prisma.product.findMany({
        select: { id: true, name: true, slug: true },
        where: { id: { in: productIds } },
      })
    : []
  const productById = new Map(
    productNames.map((product) => [product.id, product]),
  )

  return {
    productPageViews: productCurrent._sum.pageViews ?? 0,
    productVisitors: productCurrent._sum.uniqueVisitors ?? 0,
    site: {
      averageSessionDuration: formatDurationMs(
        (siteCurrent._avg.averageSessionDuration ?? 0) * 1000,
      ),
      bounceRate: formatPercent(siteCurrent._avg.bounceRate),
      engagementRate: formatPercent(siteCurrent._avg.engagementRate),
      pageViews: summarizeWindow(
        siteCurrent._sum.pageViews ?? 0,
        sitePrevious._sum.pageViews ?? 0,
      ),
      pagesPerSession: siteCurrent._avg.pagesPerSession?.toFixed(2) ?? "n/a",
      sessions: summarizeWindow(
        siteCurrent._sum.sessions ?? 0,
        sitePrevious._sum.sessions ?? 0,
      ),
      visitors: summarizeWindow(
        siteCurrent._sum.uniqueVisitors ?? 0,
        sitePrevious._sum.uniqueVisitors ?? 0,
      ),
    },
    topProducts: topProducts.map((row) => {
      const product = productById.get(row.productId)
      return {
        pageViews: row._sum.pageViews ?? 0,
        product: product?.name ?? row.productId,
        slug: product?.slug ?? "n/a",
        visitors: row._sum.uniqueVisitors ?? 0,
      }
    }),
    topReferrers: topReferrers.map((row) => ({
      pageViews: row._sum.pageViews ?? 0,
      referrer: row.referrer || "(direct)",
    })),
  }
}

async function getRevenueInsights(currentStart: Date, limit: number) {
  const [purchases, topPlans] = await Promise.all([
    prisma.userPlanPurchase.count({
      where: { createdAt: { gte: currentStart } },
    }),
    prisma.plan.findMany({
      orderBy: { purchases: { _count: "desc" } },
      select: {
        name: true,
        price: true,
        slug: true,
        type: true,
        _count: { select: { products: true, purchases: true } },
      },
      take: limit,
    }),
  ])

  return {
    purchases,
    topPlans: topPlans.map((plan) => ({
      activeProducts: plan._count.products,
      purchases: plan._count.purchases,
      plan: plan.name,
      price: formatCurrency(plan.price),
      type: plan.type,
    })),
  }
}

async function getOperationsInsights(limit: number) {
  const [
    ingestionStatus,
    latestIngestionRuns,
    ingestionFailures,
    eventStatus,
    retryingEvents,
    activeJobs,
    staleDrafts,
  ] = await Promise.all([
    prisma.analyticsIngestionRun.groupBy({
      _count: { _all: true },
      by: ["status"],
      orderBy: { status: "asc" },
      where: { createdAt: { gte: daysAgo(2) } },
    }),
    prisma.analyticsIngestionRun.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        error: true,
        finishedAt: true,
        job: true,
        startedAt: true,
        status: true,
        windowEnd: true,
      },
      take: limit,
    }),
    prisma.analyticsIngestionRun.count({
      where: { createdAt: { gte: daysAgo(2) }, status: "failed" },
    }),
    prisma.eventEnvelope.groupBy({
      _count: { _all: true },
      by: ["status"],
      orderBy: { status: "asc" },
    }),
    prisma.eventEnvelope.count({
      where: { status: { in: ["pending", "retrying"] } },
    }),
    prisma.eventEnvelope.count({
      where: { status: "processing" },
    }),
    prisma.productDraft.count({ where: { updatedAt: { lt: daysAgo(14) } } }),
  ])

  return {
    activeJobs,
    eventStatus: eventStatus.map((row) => ({
      count: row._count._all,
      status: row.status,
    })),
    ingestionFailures,
    ingestionStatus: ingestionStatus.map((row) => ({
      count: row._count._all,
      status: row.status,
    })),
    latestIngestionRuns: latestIngestionRuns.map((run) => {
      const duration =
        run.startedAt && run.finishedAt
          ? run.finishedAt.getTime() - run.startedAt.getTime()
          : null
      return {
        createdAt: formatDate(run.createdAt),
        duration: formatDurationMs(duration),
        error: run.error?.slice(0, 100) ?? "",
        job: run.job,
        status: run.status,
        windowEnd: formatDate(run.windowEnd),
      }
    }),
    retryingEvents,
    staleDrafts,
  }
}

async function buildReport(options: CliOptions) {
  const currentStart = daysAgo(options.days)
  const previousStart = daysAgo(options.days * 2)
  const previousEnd = currentStart

  const report: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    window: {
      currentStart: currentStart.toISOString(),
      days: options.days,
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString(),
    },
  }

  if (sectionEnabled(options, "overview")) {
    report.overview = await getOverview(currentStart)
  }

  if (sectionEnabled(options, "growth")) {
    report.growth = await getWindowCounts({
      currentStart,
      previousEnd,
      previousStart,
    })
  }

  if (sectionEnabled(options, "products")) {
    report.products = await getProductInsights(options.limit)
  }

  if (sectionEnabled(options, "drafts")) {
    report.drafts = await getDraftInsights(
      options.allDrafts ? null : options.limit,
    )
  }

  if (sectionEnabled(options, "traffic")) {
    report.traffic = await getTrafficInsights(
      currentStart,
      previousStart,
      options.limit,
    )
  }

  if (sectionEnabled(options, "revenue")) {
    report.revenue = await getRevenueInsights(currentStart, options.limit)
  }

  if (sectionEnabled(options, "operations")) {
    report.operations = await getOperationsInsights(options.limit)
  }

  return report
}

function renderReport(report: Record<string, any>, options: CliOptions) {
  header(report, options)

  if (report.overview) {
    const overview = report.overview
    const latestIngestion = overview.latestIngestion

    renderMetricCards("Overview", [
      {
        detail: `${formatNumber(overview.activeUsers)} active`,
        label: "Users",
        value: `${formatNumber(overview.totalUsers)} total`,
      },
      {
        detail: `${formatNumber(overview.publishedProducts)} published`,
        label: "Products",
        value: `${formatNumber(overview.totalProducts)} total`,
      },
      {
        detail: `${formatNumber(overview.categories)} categories`,
        label: "Catalog",
        value: `${formatNumber(overview.useCases)} use cases`,
      },
      {
        detail: `${formatNumber(overview.siteVisitors)} visitors`,
        label: "Site Traffic",
        value: `${formatNumber(overview.sitePageViews)} views`,
      },
      {
        detail: `${formatNumber(overview.productVisitors)} visitors`,
        label: "Product Traffic",
        value: `${formatNumber(overview.productPageViews)} views`,
      },
      {
        detail: latestIngestion
          ? `${latestIngestion.job} (${latestIngestion.duration})`
          : "No ingestion runs",
        label: "Database",
        tone: latestIngestion ? statusTone(latestIngestion.status) : "warn",
        value: `${formatNumber(overview.dbSizeMb)} MB`,
      },
    ])

    renderHealthList("Immediate Attention", [
      {
        detail: latestIngestion
          ? `${latestIngestion.job} finished ${latestIngestion.finishedAt}`
          : "No run has been recorded",
        label: "Latest ingestion",
        tone: latestIngestion ? statusTone(latestIngestion.status) : "warn",
        value: latestIngestion?.status ?? "missing",
      },
    ])
  }

  if (report.growth) {
    sectionTitle("Growth")
    renderTable(
      "Current Window vs Previous Window",
      Object.entries(report.growth).map(([metric, value]) => ({
        metric: titleize(metric),
        ...(value as TableRow),
      })),
      [
        { key: "metric", label: "Metric", maxWidth: 28 },
        { align: "right", key: "current", label: "Current" },
        { align: "right", key: "previous", label: "Previous" },
        {
          align: "right",
          format: changeCell,
          key: "change",
          label: "Change",
        },
      ],
    )
  }

  if (report.products) {
    const products = report.products
    const byStatus = products.byStatus as Array<Record<string, unknown>>
    const byType = products.byType as Array<Record<string, unknown>>
    const byPricing = products.byPricing as Array<Record<string, unknown>>
    const platforms = products.platforms as Array<Record<string, unknown>>
    const topCategories = products.topCategories as Array<
      Record<string, unknown>
    >
    const topProducts = products.topProducts as Array<Record<string, unknown>>

    renderMetricCards("Product Health", [
      {
        label: "Verified Products",
        tone: products.verifiedProducts > 0 ? "good" : "warn",
        value: formatNumber(products.verifiedProducts),
      },
      {
        detail: "Products without analytics rows",
        label: "Missing Analytics",
        tone: products.missingAnalytics > 0 ? "bad" : "good",
        value: formatNumber(products.missingAnalytics),
      },
      {
        detail: "Drafts untouched for more than 14 days",
        label: "Stale Drafts",
        tone: products.staleDrafts > 0 ? "warn" : "good",
        value: formatNumber(products.staleDrafts),
      },
    ])

    const statusMax = maxByKey(byStatus, "count")
    renderTable("Products by Status", rankRows(byStatus), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { format: statusCell, key: "status", label: "Status", maxWidth: 20 },
      { align: "right", key: "count", label: "Count" },
      {
        format: (value) => bar(value, statusMax),
        key: "count",
        label: "Share",
        width: 16,
      },
    ])

    const typeMax = maxByKey(byType, "count")
    renderTable("Products by Type", rankRows(byType), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { key: "type", label: "Type", maxWidth: 24 },
      { align: "right", key: "count", label: "Count" },
      {
        format: (value) => bar(value, typeMax),
        key: "count",
        label: "Share",
        width: 16,
      },
    ])

    const pricingMax = maxByKey(byPricing, "count")
    renderTable("Products by Pricing", rankRows(byPricing), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { key: "pricingModel", label: "Pricing", maxWidth: 24 },
      { align: "right", key: "count", label: "Count" },
      {
        format: (value) => bar(value, pricingMax),
        key: "count",
        label: "Share",
        width: 16,
      },
    ])

    const platformMax = maxByKey(platforms, "count")
    renderTable("Published Platforms", rankRows(platforms), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { key: "platform", label: "Platform", maxWidth: 28 },
      { align: "right", key: "count", label: "Count" },
      {
        format: (value) => bar(value, platformMax),
        key: "count",
        label: "Share",
        width: 16,
      },
    ])

    const categoryMax = maxByKey(topCategories, "count")
    renderTable("Top Categories", rankRows(topCategories), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { key: "category", label: "Category", maxWidth: 34 },
      { key: "slug", label: "Slug", maxWidth: 28 },
      { align: "right", key: "count", label: "Products" },
      {
        format: (value) => bar(value, categoryMax),
        key: "count",
        label: "Share",
        width: 16,
      },
    ])

    const upvoteMax = maxByKey(topProducts, "upvotes")
    renderTable("Top Products by Upvotes", rankRows(topProducts), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { key: "name", label: "Product", maxWidth: 32 },
      { key: "category", label: "Category", maxWidth: 24 },
      { align: "right", key: "upvotes", label: "Upvotes" },
      {
        format: (value) => bar(value, upvoteMax),
        key: "upvotes",
        label: "Lift",
        width: 16,
      },
      { format: statusCell, key: "status", label: "Status", maxWidth: 14 },
    ])
  }

  if (report.drafts) {
    const drafts = report.drafts
    const draftRows = drafts.drafts as Array<Record<string, unknown>>

    renderTable("Product Drafts", rankRows(draftRows), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { key: "updatedAt", label: "Updated", maxWidth: 19 },
      { align: "right", key: "age", label: "Age", maxWidth: 8 },
      { key: "owner", label: "Owner", maxWidth: 28 },
      { key: "productName", label: "Product", maxWidth: 28 },
      { key: "websiteUrl", label: "Website", maxWidth: 34 },
      { key: "step", label: "Step", maxWidth: 16 },
      { key: "type", label: "Type", maxWidth: 18 },
      { key: "pricingModel", label: "Pricing", maxWidth: 16 },
      { align: "right", key: "categories", label: "Cats", width: 4 },
      { key: "draftId", label: "Draft ID", maxWidth: 24 },
    ])
  }

  if (report.traffic) {
    const traffic = report.traffic
    const topProducts = traffic.topProducts as Array<Record<string, unknown>>
    const topReferrers = traffic.topReferrers as Array<Record<string, unknown>>

    renderMetricCards("Traffic Quality", [
      {
        detail: "Average visit length",
        label: "Avg Session",
        value: traffic.site.averageSessionDuration,
      },
      {
        detail: "Lower is better",
        label: "Bounce Rate",
        value: traffic.site.bounceRate,
      },
      {
        detail: "Higher is better",
        label: "Engagement Rate",
        value: traffic.site.engagementRate,
      },
      {
        detail: `${formatNumber(traffic.productVisitors)} visitors`,
        label: "Product Views",
        value: formatNumber(traffic.productPageViews),
      },
    ])

    renderTable(
      "Site Traffic Trend",
      ["pageViews", "visitors", "sessions"].map((metric) => ({
        metric: titleize(metric),
        ...traffic.site[metric],
      })),
      [
        { key: "metric", label: "Metric", maxWidth: 24 },
        { align: "right", key: "current", label: "Current" },
        { align: "right", key: "previous", label: "Previous" },
        { align: "right", format: changeCell, key: "change", label: "Change" },
      ],
    )

    const productTrafficMax = maxByKey(topProducts, "pageViews")
    renderTable("Top Product Traffic", rankRows(topProducts), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { key: "product", label: "Product", maxWidth: 36 },
      { key: "slug", label: "Slug", maxWidth: 28 },
      { align: "right", key: "pageViews", label: "Views" },
      { align: "right", key: "visitors", label: "Visitors" },
      {
        format: (value) => bar(value, productTrafficMax),
        key: "pageViews",
        label: "Share",
        width: 16,
      },
    ])

    const referrerMax = maxByKey(topReferrers, "pageViews")
    renderTable("Top Referrers", rankRows(topReferrers), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { key: "referrer", label: "Referrer", maxWidth: 48 },
      { align: "right", key: "pageViews", label: "Views" },
      {
        format: (value) => bar(value, referrerMax),
        key: "pageViews",
        label: "Share",
        width: 16,
      },
    ])
  }

  if (report.revenue) {
    const revenue = report.revenue
    const topPlans = revenue.topPlans as Array<Record<string, unknown>>

    renderMetricCards("Revenue Health", [
      {
        detail: `Last ${options.days} day${options.days === 1 ? "" : "s"}`,
        label: "Purchases",
        value: formatNumber(revenue.purchases),
      },
    ])

    renderTable("Top Plans", rankRows(topPlans), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { key: "plan", label: "Plan", maxWidth: 28 },
      { key: "type", label: "Type", maxWidth: 16 },
      { align: "right", key: "price", label: "Price" },
      { align: "right", key: "activeProducts", label: "Products" },
      { align: "right", key: "purchases", label: "Purchases" },
    ])
  }

  if (report.operations) {
    const operations = report.operations
    const ingestionStatus = operations.ingestionStatus as Array<
      Record<string, unknown>
    >
    const eventStatus = operations.eventStatus as Array<Record<string, unknown>>
    const latestIngestionRuns = operations.latestIngestionRuns as Array<
      Record<string, unknown>
    >

    renderMetricCards("Operations Health", [
      {
        detail: "Analytics ingestion failures in 48h",
        label: "Ingestion Failures",
        tone: operations.ingestionFailures > 0 ? "bad" : "good",
        value: formatNumber(operations.ingestionFailures),
      },
      {
        detail: "Pending or retrying event envelopes",
        label: "Event Backlog",
        tone: operations.retryingEvents > 0 ? "warn" : "good",
        value: formatNumber(operations.retryingEvents),
      },
      {
        detail: "Event envelopes currently processing",
        label: "Active Jobs",
        tone: operations.activeJobs > 0 ? "info" : "good",
        value: formatNumber(operations.activeJobs),
      },
      {
        detail: "Drafts untouched for more than 14 days",
        label: "Stale Drafts",
        tone: operations.staleDrafts > 0 ? "warn" : "good",
        value: formatNumber(operations.staleDrafts),
      },
    ])

    renderHealthList("Operational Checks", [
      {
        label: "Ingestion failures",
        tone: operations.ingestionFailures > 0 ? "bad" : "good",
        value: formatNumber(operations.ingestionFailures),
      },
      {
        label: "Event backlog",
        tone: operations.retryingEvents > 0 ? "warn" : "good",
        value: formatNumber(operations.retryingEvents),
      },
    ])

    const ingestionStatusMax = maxByKey(ingestionStatus, "count")
    renderTable("Ingestion Status 48h", rankRows(ingestionStatus), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { format: statusCell, key: "status", label: "Status", maxWidth: 18 },
      { align: "right", key: "count", label: "Count" },
      {
        format: (value) => bar(value, ingestionStatusMax),
        key: "count",
        label: "Share",
        width: 16,
      },
    ])

    const eventStatusMax = maxByKey(eventStatus, "count")
    renderTable("Event Status", rankRows(eventStatus), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { format: statusCell, key: "status", label: "Status", maxWidth: 18 },
      { align: "right", key: "count", label: "Count" },
      {
        format: (value) => bar(value, eventStatusMax),
        key: "count",
        label: "Share",
        width: 16,
      },
    ])

    renderTable("Latest Ingestion Runs", rankRows(latestIngestionRuns), [
      { align: "right", key: "rank", label: "#", width: 3 },
      { key: "job", label: "Job", maxWidth: 28 },
      { format: statusCell, key: "status", label: "Status", maxWidth: 16 },
      { key: "duration", label: "Duration", maxWidth: 10 },
      { key: "createdAt", label: "Created", maxWidth: 19 },
      { key: "windowEnd", label: "Window End", maxWidth: 19 },
      { key: "error", label: "Error", maxWidth: 44 },
    ])
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printUsage()
    return
  }

  const report = await buildReport(options)
  if (options.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    renderReport(report, options)
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
