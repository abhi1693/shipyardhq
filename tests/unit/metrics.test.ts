import { describe, expect, it } from "vitest"

import {
  otelResourceAttributes,
  otlpMetricsEndpoint,
} from "@/lib/server/metrics/otel"
import {
  pyroscopeConfig,
  pyroscopeTags,
} from "@/lib/server/metrics/profiling"
import { normalizeMetricRoute } from "@/lib/server/metrics/registry"

describe("metrics registry", () => {
  it("normalizes high-cardinality paths into stable route labels", () => {
    expect(
      normalizeMetricRoute("https://shipyardhq.dev/products/openclaw"),
    ).toBe("/products/:slug")
    expect(
      normalizeMetricRoute(
        "https://shipyardhq.dev/api/products/openclaw/upvote",
      ),
    ).toBe("/api/products/:slug/upvote")
    expect(
      normalizeMetricRoute(
        "https://shipyardhq.dev/member/products/add/c123/configuration",
      ),
    ).toBe("/member/products/add/:draftId/:step")
  })
})

describe("OTel metrics configuration", () => {
  it("uses the explicit OTLP metrics endpoint when configured", () => {
    expect(
      otlpMetricsEndpoint({
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "http://collector:4318/v1/metrics",
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://ignored:4318",
      }),
    ).toBe("http://collector:4318/v1/metrics")
  })

  it("derives the metrics endpoint from the generic OTLP endpoint", () => {
    expect(
      otlpMetricsEndpoint({
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://collector:4318/",
      }),
    ).toBe("http://collector:4318/v1/metrics")
  })

  it("uses standard resource attributes for dashboard label promotion", () => {
    expect(
      otelResourceAttributes({
        NODE_ENV: "production",
        APP_VERSION: "v1.4.49",
        OTEL_RESOURCE_ATTRIBUTES:
          "service.namespace=shipyard,deployment.environment.name=production",
        OTEL_SERVICE_NAME: "shipyardhq",
        npm_package_version: "0.0.0",
      }),
    ).toMatchObject({
      "deployment.environment.name": "production",
      "service.name": "shipyardhq",
      "service.namespace": "shipyard",
      "service.version": "1.4.49",
    })
  })

  it("keeps an explicit service version resource attribute", () => {
    expect(
      otelResourceAttributes({
        APP_VERSION: "v1.4.49",
        OTEL_RESOURCE_ATTRIBUTES: "service.version=1.2.3",
      }),
    ).toMatchObject({
      "service.version": "1.2.3",
    })
  })
})

describe("Pyroscope profiling configuration", () => {
  it("stays disabled until a Pyroscope endpoint is configured", () => {
    expect(pyroscopeConfig({ OTEL_SERVICE_NAME: "shipyardhq" })).toBeUndefined()
  })

  it("builds low-cardinality tags from OTel resource attributes", () => {
    expect(
      pyroscopeTags({
        NODE_ENV: "production",
        APP_VERSION: "v1.4.49",
        OTEL_RESOURCE_ATTRIBUTES:
          "service.namespace=shipyard,deployment.environment.name=production,k8s.container.name=worker",
      }),
    ).toEqual({
      deployment_environment: "production",
      process_role: "worker",
      service_namespace: "shipyard",
      service_version: "1.4.49",
    })
  })

  it("uses conservative profiler defaults for production", () => {
    expect(
      pyroscopeConfig({
        OTEL_SERVICE_NAME: "shipyardhq",
        PYROSCOPE_SERVER_ADDRESS: "http://pyroscope:4040",
        PYROSCOPE_TAG_PROCESS_ROLE: "web",
      }),
    ).toMatchObject({
      appName: "shipyardhq",
      flushIntervalMs: 60_000,
      heapEnabled: false,
      serverAddress: "http://pyroscope:4040",
      tags: {
        process_role: "web",
      },
      wall: {
        collectCpuTime: false,
        samplingDurationMs: 60_000,
        samplingIntervalMicros: 10_000,
      },
    })
  })
})
