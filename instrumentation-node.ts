import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { NodeSDK } from "@opentelemetry/sdk-node"
import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-node"
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions"

const DEFAULT_TRACE_SAMPLE_RATE = "0.1"
const DEFAULT_TRACE_SAMPLER = "parentbased_traceidratio"
const OTEL_TRACE_EXPORTER_ENV_KEYS = [
  "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
] as const
type TraceSamplerName =
  | "always_off"
  | "always_on"
  | "parentbased_always_off"
  | "parentbased_always_on"
  | "parentbased_traceidratio"
  | "traceidratio"

const supportedTraceSamplers = new Set<TraceSamplerName>([
  "always_off",
  "always_on",
  "parentbased_always_off",
  "parentbased_always_on",
  "parentbased_traceidratio",
  "traceidratio",
])

function requireEnv(key: string) {
  const value = process.env[key]?.trim()

  if (!value) {
    throw new Error(`[otel] Missing required OpenTelemetry env var: ${key}`)
  }

  return value
}

function assertTraceExporterEnv() {
  if (OTEL_TRACE_EXPORTER_ENV_KEYS.some((key) => process.env[key]?.trim())) {
    return
  }

  throw new Error(
    `[otel] Missing required OpenTelemetry env var: ${OTEL_TRACE_EXPORTER_ENV_KEYS.join(" or ")}`,
  )
}

function resolveTraceEndpoint() {
  const tracesEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim()
  if (tracesEndpoint) return tracesEndpoint

  const endpoint = requireEnv("OTEL_EXPORTER_OTLP_ENDPOINT")
  return `${endpoint.replace(/\/+$/, "")}/v1/traces`
}

function resolveTraceSamplerArg() {
  return (
    process.env.OTEL_TRACES_SAMPLER_ARG?.trim() || DEFAULT_TRACE_SAMPLE_RATE
  )
}

function resolveTraceSampleRate() {
  const sampleRate = Number(resolveTraceSamplerArg())

  if (!Number.isFinite(sampleRate) || sampleRate < 0 || sampleRate > 1) {
    throw new Error(
      "[otel] OTEL_TRACES_SAMPLER_ARG must be a number from 0 to 1",
    )
  }

  return sampleRate
}

function resolveTraceSamplerName(): TraceSamplerName {
  const sampler = process.env.OTEL_TRACES_SAMPLER?.trim() as
    | TraceSamplerName
    | undefined

  return sampler && supportedTraceSamplers.has(sampler)
    ? sampler
    : DEFAULT_TRACE_SAMPLER
}

function resolveTraceSampler() {
  const sampleRate = resolveTraceSampleRate()
  const samplerName = resolveTraceSamplerName()

  switch (samplerName) {
    case "always_off":
      return new AlwaysOffSampler()
    case "always_on":
      return new AlwaysOnSampler()
    case "parentbased_always_off":
      return new ParentBasedSampler({ root: new AlwaysOffSampler() })
    case "parentbased_always_on":
      return new ParentBasedSampler({ root: new AlwaysOnSampler() })
    case "traceidratio":
      return new TraceIdRatioBasedSampler(sampleRate)
    case "parentbased_traceidratio":
      return new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(sampleRate),
      })
  }
}

function resolveResourceAttributes() {
  const attributes: Record<string, string> = {
    [ATTR_SERVICE_NAME]: requireEnv("OTEL_SERVICE_NAME"),
  }

  const serviceVersion =
    process.env.OTEL_SERVICE_VERSION?.trim() ||
    process.env.GIT_SHA?.trim() ||
    process.env.COMMIT_SHA?.trim()
  const deploymentEnvironment =
    process.env.OTEL_DEPLOYMENT_ENVIRONMENT?.trim() ||
    process.env.NODE_ENV?.trim()

  if (serviceVersion) {
    attributes[ATTR_SERVICE_VERSION] = serviceVersion
  }
  if (deploymentEnvironment) {
    attributes[ATTR_DEPLOYMENT_ENVIRONMENT_NAME] = deploymentEnvironment
  }

  return attributes
}

assertTraceExporterEnv()
process.env.OTEL_TRACES_SAMPLER_ARG = resolveTraceSamplerArg()

const sdk = new NodeSDK({
  resource: resourceFromAttributes(resolveResourceAttributes()),
  sampler: resolveTraceSampler(),
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: resolveTraceEndpoint(),
      }),
    ),
  ],
})

sdk.start()
