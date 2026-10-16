// @vitest-environment node
import http from "node:http"
import { Socket } from "node:net"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ record: vi.fn() }))
vi.mock("@opentelemetry/api", () => ({
  metrics: {
    getMeter: () => ({ createHistogram: () => ({ record: mocks.record }) }),
  },
}))

import { registerHttpRedMetrics } from "@/lib/server/metrics/http-red"

const originalEmit = http.Server.prototype.emit
beforeAll(() => registerHttpRedMetrics())
afterAll(() => {
  http.Server.prototype.emit = originalEmit
  Reflect.deleteProperty(
    globalThis,
    Symbol.for("shipyard.metrics.http-red.instrumented"),
  )
})

function request(headers: http.IncomingHttpHeaders = {}) {
  const server = new http.Server()
  const req = new http.IncomingMessage(new Socket())
  req.method = "GET"
  req.url = "/member/products/private-product/upgrade?token=secret"
  req.headers = headers
  const res = new http.ServerResponse(req)
  server.emit("request", req, res)
  return { server, req, res }
}

function expectClean(res: http.ServerResponse) {
  expect(res.listenerCount("finish")).toBe(0)
  expect(res.listenerCount("close")).toBe(0)
  expect(res.listenerCount("error")).toBe(0)
}

describe("HTTP response observation", () => {
  it("registers only once, including a repeated request event for the response", () => {
    registerHttpRedMetrics()
    const { server, req, res } = request()
    server.emit("request", req, res)
    expect(res.listenerCount("close")).toBe(1)
    res.emit("finish")
    res.emit("close")
    expect(mocks.record).toHaveBeenCalledTimes(1)
    expectClean(res)
  })

  it("cleans up both terminal listeners on normal completion", () => {
    const { res } = request()
    res.emit("finish")
    expectClean(res)
    expect(mocks.record).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ "http.response.status_code": 200 }),
    )
  })

  it("records a disconnect after end() but before flushing as 499", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { res } = request({
      "x-request-id": "request-124",
      "cf-ray": "abcd-BLR",
    })
    Object.defineProperty(res, "writableEnded", { value: true })
    res.emit("close")
    expectClean(res)
    expect(mocks.record).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ "http.response.status_code": 499 }),
    )
    const log = JSON.parse(warn.mock.calls[0][1])
    expect(log).toMatchObject({
      requestId: "request-124",
      cfRay: "abcd-BLR",
      route: "/member/products/:slug/upgrade",
      statusCode: 499,
      outcome: "close",
    })
    expect(JSON.stringify(log)).not.toContain("secret")
    expect(JSON.stringify(log)).not.toContain("private-product")
  })

  it("records response errors once and removes its listeners", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { res } = request()
    res.emit(
      "error",
      Object.assign(new Error("private data"), { code: "ECONNRESET" }),
    )
    res.emit("close")
    expectClean(res)
    expect(mocks.record).toHaveBeenCalledTimes(1)
    expect(JSON.parse(warn.mock.calls[0][1])).toMatchObject({
      errorCode: "ECONNRESET",
      statusCode: 500,
      outcome: "error",
    })
    expect(warn.mock.calls[0][1]).not.toContain("private data")
  })

  it("reports completed server errors with a request ID", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { req, res } = request({ "x-request-id": "invalid request id" })
    expect(res.getHeader("x-request-id")).toBe(req.headers["x-request-id"])
    expect(req.headers["x-request-id"]).toMatch(/^[a-f0-9-]{36}$/)
    res.statusCode = 503
    res.emit("finish")
    expectClean(res)
    expect(JSON.parse(warn.mock.calls[0][1])).toMatchObject({ statusCode: 503 })
  })

  it("does not accumulate listeners over repeated requests", () => {
    for (let index = 0; index < 30; index++) {
      const { res } = request()
      expect(res.getMaxListeners()).toBe(10)
      expect(res.listenerCount("close")).toBe(1)
      res.emit("finish")
      expectClean(res)
    }
    expect(mocks.record).toHaveBeenCalledTimes(30)
  })
})
