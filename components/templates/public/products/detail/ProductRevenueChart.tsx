"use client"

import { useCallback, useId, useMemo, useRef, useState } from "react"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Button } from "@/components/atoms/button"
import { Image } from "@/components/atoms/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog"
import { siteConfig } from "@/lib/siteConfig"
import { cn } from "@/lib/utils"
import { Download, ShieldCheckIcon } from "lucide-react"
import * as htmlToImage from "html-to-image"

type RevenuePoint = {
  label: string
  periodStart: string
  allTimeRevenueCents: number
  periodRevenueCents: number
}

type RevenueSummary = {
  currencyCode: string
  latestAllTimeRevenueCents: number
  provider?: string
  lastSyncedAt?: string | null
}

type GradientOption = {
  id:
    | "deep-sea"
    | "sunset"
    | "emerald-mist"
    | "twilight"
    | "carbon-blue"
  label: string
  start: string
  end: string
  previewOverlay?: string
  previewAccent?: string
}

function formatCurrency(amountCents: number, currency?: string) {
  const code = currency || "USD"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format((amountCents || 0) / 100)
  } catch {
    return `$${((amountCents || 0) / 100).toFixed(0)}`
  }
}

function formatProviderLabel(provider?: string | null) {
  if (!provider) return "Connected provider"
  return provider
    .trim()
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function ProductRevenueChart({
  points,
  summary,
  productName,
  productLogoUrl,
}: {
  points: RevenuePoint[]
  summary: RevenueSummary
  productName?: string
  productLogoUrl?: string | null
}) {
  const currency = summary.currencyCode || "USD"
  const [range, setRange] = useState<
    "24h" | "7d" | "1m" | "3m" | "6m" | "1y" | "all"
  >("all")

  const filtered = useMemo(() => {
    let cutoff: Date | null = null
    if (range !== "all") {
      const now = new Date()
      cutoff = new Date(now)
      if (range === "24h") cutoff.setDate(now.getDate() - 1)
      if (range === "7d") cutoff.setDate(now.getDate() - 7)
      if (range === "1m") cutoff.setMonth(now.getMonth() - 1)
      if (range === "3m") cutoff.setMonth(now.getMonth() - 3)
      if (range === "6m") cutoff.setMonth(now.getMonth() - 6)
      if (range === "1y") cutoff.setFullYear(now.getFullYear() - 1)
    }
    return points
      .filter((p) => (cutoff ? new Date(p.periodStart) >= cutoff : true))
      .map((point) => ({
        date: new Date(point.periodStart),
        label: point.label,
        revenue: point.periodRevenueCents / 100,
      }))
  }, [points, range])

  const aggregated = useMemo(() => {
    const bucketKey = (d: Date) => {
      switch (range) {
        case "24h":
        case "7d":
          return d.toISOString().slice(0, 10) // daily
        case "1m":
        case "3m":
        case "6m": {
          const weekStart = new Date(
            Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
          )
          const day = weekStart.getUTCDay()
          // Normalize to Monday as start of week
          weekStart.setUTCDate(weekStart.getUTCDate() - ((day + 6) % 7))
          return `w-${weekStart.toISOString().slice(0, 10)}`
        }
        case "1y":
        case "all":
        default:
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      }
    }

    const bucketDate = (key: string) => {
      if (key.startsWith("w-")) return new Date(`${key.slice(2)}T00:00:00.000Z`)
      if (key.length === 7) {
        const [year, month] = key.split("-").map(Number)
        return new Date(Date.UTC(year, (month || 1) - 1, 1))
      }
      return new Date(key)
    }

    const byBucket = new Map<
      string,
      { date: Date; revenue: number }
    >()
    for (const point of filtered) {
      const d = point.date
      const key = bucketKey(d)
      const start = bucketDate(key)
      const existing = byBucket.get(key)
      const updated = {
        date: existing?.date ?? start,
        revenue: (existing?.revenue ?? 0) + point.revenue,
      }
      byBucket.set(key, updated)
    }
    return Array.from(byBucket.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    )
  }, [filtered, range])

  const formatValue = (value: number) =>
    formatCurrency(Math.round(value * 100), currency)
  const chartData = aggregated.map((point) => ({
    ...point,
    value: point.revenue,
  }))

  const revenueDisplay =
    typeof summary.latestAllTimeRevenueCents === "number"
      ? formatCurrency(summary.latestAllTimeRevenueCents, currency)
      : null
  const providerLabel = formatProviderLabel(summary.provider)

  const [exportOpen, setExportOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const hasData = chartData.length > 0
  const filename = `${(productName ?? "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "product"}-revenue.png`
  const previewTitle = productName ? `${productName} revenue` : "Product revenue"
  const previewRef = useRef<HTMLDivElement>(null)
  const chartGradientId = useId()
  const previewGradientId = useId()
  const [gradientId, setGradientId] =
    useState<GradientOption["id"]>("deep-sea")

  const gradientOptions: GradientOption[] = [
    {
      id: "deep-sea",
      label: "Deep sea",
      start: "#0c1f3b",
      end: "#0b72ff",
      previewOverlay:
        "radial-gradient(circle at 18% 20%, rgba(255,255,255,0.14), transparent 45%), radial-gradient(circle at 82% 24%, rgba(255,255,255,0.12), transparent 46%)",
    },
    {
      id: "sunset",
      label: "Sunset flame",
      start: "#2f0d2d",
      end: "#ff7a59",
      previewOverlay:
        "radial-gradient(circle at 30% 26%, rgba(255,255,255,0.18), transparent 42%), radial-gradient(circle at 70% 18%, rgba(255,255,255,0.1), transparent 52%)",
    },
    {
      id: "emerald-mist",
      label: "Emerald mist",
      start: "#0b3d2e",
      end: "#22c55e",
      previewOverlay:
        "radial-gradient(circle at 24% 30%, rgba(255,255,255,0.12), transparent 48%), radial-gradient(circle at 78% 28%, rgba(255,255,255,0.08), transparent 52%)",
    },
    {
      id: "twilight",
      label: "Twilight",
      start: "#0f172a",
      end: "#6366f1",
      previewOverlay:
        "radial-gradient(circle at 22% 22%, rgba(255,255,255,0.1), transparent 46%), radial-gradient(circle at 82% 20%, rgba(255,255,255,0.12), transparent 50%)",
    },
    {
      id: "carbon-blue",
      label: "Carbon blue",
      start: "#0f1115",
      end: "#3a3f4b",
      previewOverlay:
        "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.08), transparent 44%), radial-gradient(circle at 84% 24%, rgba(255,255,255,0.08), transparent 52%)",
    },
  ]
  const selectedGradient =
    gradientOptions.find((item) => item.id === gradientId) ?? gradientOptions[0]
  const previewBackground = `${
    selectedGradient.previewOverlay
      ? `${selectedGradient.previewOverlay}, `
      : ""
  }linear-gradient(135deg, ${selectedGradient.start}, ${selectedGradient.end})`

  const renderExportImage = useCallback(async () => {
    if (!hasData || typeof window === "undefined") return null

    const width = 1280
    const height = 720
    const cardX = 80
    const cardY = 80
    const cardWidth = width - cardX * 2
    const cardHeight = height - cardY - 80
    const chartLeft = cardX + 28
    const chartRight = cardX + cardWidth - 28
    const chartTop = cardY + 72
    const chartBottom = cardY + cardHeight - 96
    const chartWidth = chartRight - chartLeft
    const chartHeight = chartBottom - chartTop
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, selectedGradient.start)
    gradient.addColorStop(1, selectedGradient.end)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    const spotlight = ctx.createRadialGradient(
      width / 2,
      height * 0.32,
      width * 0.12,
      width / 2,
      height * 0.32,
      width * 0.75,
    )
    spotlight.addColorStop(0, "rgba(255,255,255,0.25)")
    spotlight.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = spotlight
    ctx.fillRect(0, 0, width, height)

    // Card background
    const radius = 18
    const drawRoundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
    ) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    }
    drawRoundedRect(cardX, cardY, cardWidth, cardHeight, radius)
    ctx.fillStyle = "rgba(255,255,255,1)"
    ctx.fill()
    ctx.strokeStyle = "rgba(15,23,42,0.06)"
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Header text + revenue badge
    ctx.fillStyle = "#0f172a"
    ctx.font = "600 20px 'Inter','Helvetica Neue',Arial,sans-serif"
    ctx.textAlign = "left"
    ctx.fillText(previewTitle, cardX + 28, cardY + 40)

    if (revenueDisplay) {
      const badgePaddingX = 12
      const badgePaddingY = 8
      const badgeText = `${revenueDisplay} · verified`
      ctx.font = "600 14px 'Inter','Helvetica Neue',Arial,sans-serif"
      const textMetrics = ctx.measureText(badgeText)
      const badgeWidth = textMetrics.width + badgePaddingX * 2 + 12
      const badgeHeight = 32
      const badgeX = cardX + cardWidth - 28 - badgeWidth
      const badgeY = cardY + 20
      ctx.fillStyle = "rgba(248,250,252,1)"
      drawRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 14)
      ctx.fill()
      ctx.strokeStyle = "rgba(226,232,240,1)"
      ctx.stroke()
      // Dot
      ctx.beginPath()
      ctx.fillStyle = "#10b981"
      ctx.arc(badgeX + 12, badgeY + badgeHeight / 2, 4, 0, Math.PI * 2)
      ctx.fill()
      // Text
      ctx.fillStyle = "#0f172a"
      ctx.font = "600 14px 'Inter','Helvetica Neue',Arial,sans-serif"
      ctx.fillText(badgeText, badgeX + 22, badgeY + badgeHeight / 2 + 5)
    }

    const values = chartData.map((point) => point.value)
    const minValue = Math.min(...values, 0)
    const maxValue = Math.max(...values, 1)
    const valueRange = Math.max(maxValue - minValue, 1)
    const step = chartWidth / Math.max(chartData.length - 1, 1)
    const coords = chartData.map((point, index) => ({
      x: chartLeft + step * index,
      y:
        chartTop +
        chartHeight -
        ((point.value - minValue) / valueRange) * chartHeight,
    }))

    ctx.save()
    ctx.strokeStyle = "rgba(226,232,240,1)"
    ctx.lineWidth = 1
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const y = chartTop + (chartHeight / gridLines) * i
      ctx.beginPath()
      ctx.moveTo(chartLeft, y)
      ctx.lineTo(chartRight, y)
      ctx.stroke()
    }
    ctx.restore()

    if (coords.length > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(coords[0].x, coords[0].y)
      coords.slice(1).forEach(({ x, y }) => ctx.lineTo(x, y))
      ctx.lineTo(coords.at(-1)!.x, chartTop + chartHeight)
      ctx.lineTo(coords[0].x, chartTop + chartHeight)
      ctx.closePath()
      const fill = ctx.createLinearGradient(
        0,
        chartTop,
        0,
        chartTop + chartHeight,
      )
      fill.addColorStop(0, "rgba(37,99,235,0.24)")
      fill.addColorStop(1, "rgba(37,99,235,0.06)")
      ctx.fillStyle = fill
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(coords[0].x, coords[0].y)
      coords.slice(1).forEach(({ x, y }) => ctx.lineTo(x, y))
      ctx.strokeStyle = "rgba(37,99,235,0.9)"
      ctx.lineWidth = 3
      ctx.stroke()

      ctx.fillStyle = "rgba(37,99,235,0.9)"
      coords.forEach(({ x, y }) => {
        ctx.beginPath()
        ctx.arc(x, y, 4.5, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.restore()
    }

    ctx.save()
    ctx.textAlign = "center"
    try {
      const brandText = siteConfig.name
      const logo = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image()
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = "/brand-white.png"
      })
      const logoSize = 56
      const centerX = cardX + cardWidth / 2
      const centerY = cardY + cardHeight - 80
      ctx.save()
      ctx.drawImage(
        logo,
        centerX - logoSize / 2,
        centerY - logoSize / 2,
        logoSize,
        logoSize,
      )
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.font = "600 22px 'Inter','Helvetica Neue',Arial,sans-serif"
      ctx.fillStyle = "#ffffff"
      ctx.fillText(brandText, centerX + logoSize / 2 + 6, centerY)
      ctx.restore()
    } catch (error) {
      console.error("Could not load brand logo for export", error)
    }
    ctx.restore()

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png")
    })
  }, [chartData, hasData, selectedGradient.end, selectedGradient.start])

  const handleDownload = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const blob =
        (previewRef.current
          ? await htmlToImage.toBlob(previewRef.current, { pixelRatio: 2 })
          : null) || (await renderExportImage())
      if (!blob) throw new Error("Failed to render export image")
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }, [filename, isExporting, renderExportImage])

  const ChartFigure = ({
    className,
    gradientId,
  }: {
    className?: string
    gradientId: string
  }) => (
    <div className="w-full">
      <div className={cn("relative", className ?? "h-72")}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 16, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(221, 83%, 53%)"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(221, 83%, 53%)"
                    stopOpacity={0.03}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(220, 13%, 90%)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    year: "numeric",
                    day:
                      range === "24h" || range === "7d" ? "numeric" : undefined,
                  }).format(new Date(value))
                }
                tick={{ fontSize: 11, fill: "hsl(215, 16%, 40%)" }}
              />
              <YAxis
                tickFormatter={(value) => formatValue(Number(value))}
                tick={{ fontSize: 11, fill: "hsl(215, 16%, 40%)" }}
                width={64}
              />
              <Tooltip
                formatter={(value: any) => [
                  formatValue(Number(value)),
                  "Revenue",
                ]}
                labelFormatter={(label) => {
                  const date = new Date(label)
                  const isWeekly =
                    range === "1m" || range === "3m" || range === "6m"
                  const isMonthly = range === "all" || range === "1y"

                  if (isWeekly) {
                    const formatted = new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                    }).format(date)
                    return `Week of ${formatted}`
                  }

                  const formatted = new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    year: "numeric",
                    day: isMonthly ? undefined : "numeric",
                  }).format(date)
                  return formatted
                }}
                contentStyle={{
                  borderRadius: 10,
                  borderColor: "hsl(220, 13%, 85%)",
                  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.15)",
                  fontSize: 12,
                }}
                itemStyle={{ fontWeight: 700, fontSize: 12, color: "#111" }}
                labelStyle={{ fontWeight: 600, fontSize: 12, color: "#111" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(221, 83%, 53%)"
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No revenue recorded for this range.
          </div>
        )}
      </div>
    </div>
  )

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <p className="text-lg font-semibold leading-tight">
            {previewTitle}
          </p>
          {revenueDisplay ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground shadow-sm shadow-black/5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              {revenueDisplay} total verified
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <Select
            value={range}
            onValueChange={(value) =>
              setRange(
                value as "24h" | "7d" | "1m" | "3m" | "6m" | "1y" | "all",
              )
            }
          >
            <SelectTrigger className="h-10 min-w-[150px] px-3 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[180px] text-sm">
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="1m">Last 1 month</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last 1 year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ChartFigure className="h-72" gradientId={chartGradientId} />

      <div className="flex items-center justify-between gap-3">
        {summary.lastSyncedAt ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheckIcon className="h-4 w-4 text-foreground/80" aria-hidden />
            <span>
              All revenue is verified through{" "}
              <span className="font-semibold">{providerLabel}</span>{" "}
              API keys. Last updated:{" "}
              {new Date(summary.lastSyncedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ) : (
          <div />
        )}
        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full bg-muted text-foreground shadow-sm shadow-black/10 transition hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={!hasData}
              aria-label="Export revenue chart"
            >
              <Download className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-5xl">
            <DialogHeader className="space-y-1">
              <DialogTitle>Export product revenue</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div
                ref={previewRef}
                className="relative overflow-hidden rounded-2xl border border-white/20 px-6 py-8 shadow-2xl"
                style={{ backgroundImage: previewBackground }}
              >
                <div className="relative mx-auto flex max-w-4xl flex-col gap-6">
                  <div className="rounded-2xl border border-white/20 bg-white p-4 shadow-lg">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-left">
                      <p className="text-base font-semibold text-slate-900">
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {productLogoUrl ? (
                            <Image
                              src={productLogoUrl}
                              alt={`${productName ?? "Product"} logo`}
                              width={28}
                              height={28}
                              className="h-7 w-7 rounded-lg border border-slate-200 object-cover shadow-sm"
                            />
                          ) : null}
                          <span>{previewTitle}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                            <span>Verified via {providerLabel}</span>
                          </span>
                        </span>
                      </p>
                      {revenueDisplay ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                          {revenueDisplay}
                          <span className="text-[11px] font-medium text-slate-500">
                            verified
                          </span>
                        </span>
                      ) : null}
                    </div>
                    <ChartFigure
                      className="h-[320px]"
                      gradientId={previewGradientId}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-white">
                    <Image
                      src="/brand-white.png"
                      alt={siteConfig.name}
                      width={56}
                      height={56}
                      className="drop-shadow-lg"
                    />
                    <span className="text-xl font-semibold tracking-wide">
                      {siteConfig.name}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {gradientOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setGradientId(option.id)}
                        className={cn(
                          "group relative inline-flex size-10 items-center justify-center rounded-full border border-white/30 shadow-sm transition cursor-pointer",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:scale-105",
                          option.id === gradientId
                            ? "ring-2 ring-white/70 ring-offset-2"
                            : "opacity-80 hover:opacity-100",
                        )}
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${option.start}, ${option.end})`,
                        }}
                        aria-label={option.label}
                        aria-pressed={option.id === gradientId}
                      >
                        <span className="sr-only">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleDownload}
                    disabled={!hasData || isExporting}
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? "Preparing..." : "Download PNG"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}
