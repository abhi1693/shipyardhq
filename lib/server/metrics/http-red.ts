import http from "node:http"
import { randomUUID } from "node:crypto"
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
const OBSERVED_RESPONSES = new WeakSet<ServerResponse>()

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
    if (
      event === "request" &&
      isRequestArgs(args) &&
      !OBSERVED_RESPONSES.has(args[1])
    ) {
      const [req, res] = args
      OBSERVED_RESPONSES.add(res)
      const startedAt = performance.now()
      const suppliedId = req.headers["x-request-id"]
      const requestId =
        typeof suppliedId === "string" &&
        /^[a-zA-Z0-9._-]{1,128}$/.test(suppliedId)
          ? suppliedId
          : randomUUID()
      req.headers["x-request-id"] = requestId
      res.setHeader("X-Request-ID", requestId)
      const route = normalizeMetricRoute(req.url)
      const method = req.method
      const ray = req.headers["cf-ray"]
      const cfRay =
        typeof ray === "string" && /^[a-zA-Z0-9-]{1,128}$/.test(ray)
          ? ray
          : undefined
      let recorded = false

      const finish = (statusCode: number, outcome: string, error?: Error) => {
        if (recorded) return
        recorded = true
        res.removeListener("finish", onFinish)
        res.removeListener("close", onClose)
        res.removeListener("error", onError)
        const durationSeconds = (performance.now() - startedAt) / 1000
        record({
          durationSeconds,
          method,
          statusCode,
          url: req.url,
        })
        if (statusCode >= 500 || outcome !== "finish") {
          console.warn(
            "[http] response failed",
            JSON.stringify({
              requestId,
              cfRay,
              method,
              route,
              statusCode,
              outcome,
              durationMs: Math.round(durationSeconds * 1000),
              errorCode: (error as NodeJS.ErrnoException | undefined)?.code,
            }),
          )
        }
      }

      const onFinish = () => finish(res.statusCode, "finish")
      // end() can be called before the bytes are flushed. writableFinished
      // distinguishes a completed response from a disconnect during that gap.
      const onClose = () =>
        finish(
          res.writableFinished ? res.statusCode : 499,
          res.writableFinished ? "finish" : "close",
        )
      const onError = (error: Error) => finish(500, "error", error)
      res.once("finish", onFinish)
      res.once("close", onClose)
      res.once("error", onError)
    }

    return originalEmit.call(this, event, ...args)
  }
}
