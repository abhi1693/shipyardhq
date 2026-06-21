import http from "node:http"
import { performance } from "node:perf_hooks"
import type { IncomingMessage, ServerResponse } from "node:http"

import { metrics, type Histogram } from "@opentelemetry/api"
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  METRIC_HTTP_SERVER_REQUEST_DURATION,
} from "@opentelemetry/semantic-conventions"

import { normalizeMetricRoute } from "@/lib/server/metrics/registry"

const INSTRUMENTED_KEY = Symbol.for("shipyard.metrics.http-red.instrumented")

type InstrumentedGlobal = typeof globalThis & {
  [INSTRUMENTED_KEY]?: boolean
}

type RedInstruments = {
  serverDuration: Histogram
}

let redInstruments: RedInstruments | null = null

function instruments() {
  if (redInstruments) return redInstruments

  const meter = metrics.getMeter("shipyardhq.red")
  redInstruments = {
    serverDuration: meter.createHistogram(METRIC_HTTP_SERVER_REQUEST_DURATION, {
      description: "Duration of HTTP server requests.",
      unit: "s",
    }),
  }

  return redInstruments
}

function isRequestArgs(
  args: unknown[],
): args is [IncomingMessage, ServerResponse] {
  const [req, res] = args

  return (
    Boolean(req) &&
    Boolean(res) &&
    typeof (req as IncomingMessage).method === "string" &&
    typeof (req as IncomingMessage).url === "string" &&
    typeof (res as ServerResponse).once === "function"
  )
}

function record(args: {
  durationSeconds: number
  method?: string
  statusCode: number
  url?: string
}) {
  const route = normalizeMetricRoute(args.url)
  if (route === "/metrics") return

  const current = instruments()
  const attributes = {
    [ATTR_HTTP_REQUEST_METHOD]: (args.method || "UNKNOWN").toUpperCase(),
    [ATTR_HTTP_RESPONSE_STATUS_CODE]: args.statusCode,
    [ATTR_HTTP_ROUTE]: route,
  }

  current.serverDuration.record(Math.max(0, args.durationSeconds), attributes)
}

export function registerHttpRedMetrics() {
  const state = globalThis as InstrumentedGlobal
  if (state[INSTRUMENTED_KEY]) return
  state[INSTRUMENTED_KEY] = true
  instruments()

  const originalEmit = http.Server.prototype.emit

  http.Server.prototype.emit = function patchedEmit(
    this: http.Server,
    event: string | symbol,
    ...args: unknown[]
  ) {
    if (event === "request" && isRequestArgs(args)) {
      const [req, res] = args
      const startedAt = performance.now()
      let recorded = false

      const finish = (statusCode: number) => {
        if (recorded) return
        recorded = true
        record({
          durationSeconds: (performance.now() - startedAt) / 1000,
          method: req.method,
          statusCode,
          url: req.url,
        })
      }

      res.once("finish", () => {
        finish(res.statusCode)
      })
      res.once("close", () => {
        if (!res.writableEnded) {
          finish(499)
        }
      })
    }

    return originalEmit.call(this, event, ...args)
  }
}
