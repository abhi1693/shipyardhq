"use client"

import dynamic from "next/dynamic"
import type { ReactElement } from "react"

import type { AnalyticsBarChartProps } from "./AnalyticsBarChart"
import type {
  AnalyticsLineChartProps,
  AnalyticsLineDefinition,
} from "./AnalyticsLineChart"
import type { AnalyticsPieChartProps } from "./AnalyticsPieChart"

export type { AnalyticsLineDefinition }

type AnalyticsBarChartComponent = <DataPoint extends object>(
  props: AnalyticsBarChartProps<DataPoint>,
) => ReactElement | null

type AnalyticsLineChartComponent = <DataPoint extends object>(
  props: AnalyticsLineChartProps<DataPoint>,
) => ReactElement | null

type AnalyticsPieChartComponent = <DataPoint extends object>(
  props: AnalyticsPieChartProps<DataPoint>,
) => ReactElement | null

function ChartLoadingState() {
  return (
    <div
      className="min-h-[260px] rounded-lg border border-dashed border-slate-200 bg-slate-50"
      aria-hidden
    />
  )
}

const DynamicAnalyticsBarChart = dynamic(
  () =>
    import("./AnalyticsBarChart").then((module) => module.AnalyticsBarChart),
  {
    ssr: false,
    loading: () => <ChartLoadingState />,
  },
) as AnalyticsBarChartComponent

const DynamicAnalyticsLineChart = dynamic(
  () =>
    import("./AnalyticsLineChart").then((module) => module.AnalyticsLineChart),
  {
    ssr: false,
    loading: () => <ChartLoadingState />,
  },
) as AnalyticsLineChartComponent

const DynamicAnalyticsPieChart = dynamic(
  () =>
    import("./AnalyticsPieChart").then((module) => module.AnalyticsPieChart),
  {
    ssr: false,
    loading: () => <ChartLoadingState />,
  },
) as AnalyticsPieChartComponent

export function LazyAnalyticsBarChart<DataPoint extends object>(
  props: AnalyticsBarChartProps<DataPoint>,
) {
  return <DynamicAnalyticsBarChart {...props} />
}

export function LazyAnalyticsLineChart<DataPoint extends object>(
  props: AnalyticsLineChartProps<DataPoint>,
) {
  return <DynamicAnalyticsLineChart {...props} />
}

export function LazyAnalyticsPieChart<DataPoint extends object>(
  props: AnalyticsPieChartProps<DataPoint>,
) {
  return <DynamicAnalyticsPieChart {...props} />
}
