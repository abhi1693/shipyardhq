import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import {
  AggregationType,
  PeriodicExportingMetricReader,
  type MetricReader,
} from "@opentelemetry/sdk-metrics"
import { NodeSDK } from "@opentelemetry/sdk-node"
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_NAMESPACE,
  ATTR_SERVICE_VERSION,
  METRIC_HTTP_CLIENT_REQUEST_DURATION,
  METRIC_HTTP_SERVER_REQUEST_DURATION,
} from "@opentelemetry/semantic-conventions"

import { registerHttpRedMetrics } from "@/lib/server/metrics/http-red"

const OTEL_STATE_KEY = Symbol.for("shipyard.metrics.otel.state")

type OTelEnv = Record<string, string | undefined>

type OTelState = {
  shutdownPromise?: Promise<void>
  sdk?: NodeSDK
  started?: boolean
}

type OTelGlobal = typeof globalThis & {
  [OTEL_STATE_KEY]?: OTelState
}

function state() {
  const globalState = globalThis as OTelGlobal
  globalState[OTEL_STATE_KEY] ??= {}
  return globalState[OTEL_STATE_KEY]
}

function trimmed(value: string | undefined) {
  const next = value?.trim()
  return next ? next : undefined
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function metricsEndpointFromBase(endpoint: string) {
  const base = endpoint.replace(/\/+$/, "")
  return base.endsWith("/v1/metrics") ? base : `${base}/v1/metrics`
}

function parseResourceAttributes(value: string | undefined) {
  const attributes: Record<string, string> = {}

  for (const pair of value?.split(",") ?? []) {
    const separator = pair.indexOf("=")
    if (separator <= 0) continue

    const key = pair.slice(0, separator).trim()
    const rawValue = pair.slice(separator + 1).trim()
    if (!key || !rawValue) continue

    try {
      attributes[key] = decodeURIComponent(rawValue)
    } catch {
      attributes[key] = rawValue
    }
  }

  return attributes
}

export function otlpMetricsEndpoint(env: OTelEnv = process.env) {
  const metricsEndpoint = trimmed(env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT)
  if (metricsEndpoint) return metricsEndpoint

  const baseEndpoint = trimmed(env.OTEL_EXPORTER_OTLP_ENDPOINT)
  return baseEndpoint ? metricsEndpointFromBase(baseEndpoint) : undefined
}

export function otelResourceAttributes(env: OTelEnv = process.env) {
  const envAttributes = parseResourceAttributes(env.OTEL_RESOURCE_ATTRIBUTES)

  return {
    ...envAttributes,
    [ATTR_SERVICE_NAME]:
      trimmed(env.OTEL_SERVICE_NAME) ||
      envAttributes[ATTR_SERVICE_NAME] ||
      "shipyardhq",
    [ATTR_SERVICE_NAMESPACE]:
      envAttributes[ATTR_SERVICE_NAMESPACE] || "shipyard",
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]:
      envAttributes[ATTR_DEPLOYMENT_ENVIRONMENT_NAME] ||
      trimmed(env.NODE_ENV) ||
      "unknown",
    [ATTR_SERVICE_VERSION]:
      envAttributes[ATTR_SERVICE_VERSION] ||
      trimmed(env.npm_package_version) ||
      "0.0.0",
  }
}

function metricReaders(): MetricReader[] {
  const endpoint = otlpMetricsEndpoint()
  if (!endpoint) return []

  return [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: endpoint,
      }),
      exportIntervalMillis: parsePositiveInteger(
        process.env.OTEL_METRIC_EXPORT_INTERVAL,
        60_000,
      ),
      exportTimeoutMillis: parsePositiveInteger(
        process.env.OTEL_METRIC_EXPORT_TIMEOUT,
        30_000,
      ),
    }),
  ]
}

export function registerOpenTelemetry() {
  const currentState = state()
  if (currentState.started) return

  process.env.OTEL_SEMCONV_STABILITY_OPT_IN ??= "http"

  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-http": {
          disableIncomingRequestInstrumentation: true,
        },
      }),
    ],
    metricReaders: metricReaders(),
    resource: resourceFromAttributes(otelResourceAttributes()),
    views: [
      {
        aggregation: {
          options: {
            boundaries: [
              0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5,
              7.5, 10,
            ],
          },
          type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
        },
        instrumentName: METRIC_HTTP_SERVER_REQUEST_DURATION,
      },
      {
        aggregation: {
          options: {
            boundaries: [
              0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5,
              7.5, 10,
            ],
          },
          type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
        },
        instrumentName: METRIC_HTTP_CLIENT_REQUEST_DURATION,
      },
    ],
  })

  sdk.start()
  currentState.sdk = sdk
  currentState.started = true
  currentState.shutdownPromise = undefined
  registerHttpRedMetrics()

  const shutdown = () => void shutdownOpenTelemetry()
  process.once("SIGTERM", shutdown)
  process.once("SIGINT", shutdown)
}

export async function shutdownOpenTelemetry() {
  const currentState = state()
  if (!currentState.sdk) return

  currentState.shutdownPromise ??= currentState.sdk
    .shutdown()
    .catch((error) => {
      console.error("[metrics] failed to shut down OpenTelemetry", error)
    })
    .finally(() => {
      currentState.sdk = undefined
      currentState.started = false
      currentState.shutdownPromise = undefined
    })

  await currentState.shutdownPromise
}
