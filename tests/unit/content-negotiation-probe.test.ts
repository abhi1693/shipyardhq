// @vitest-environment node
import { createServer } from "node:http"
import { spawn } from "node:child_process"
import { afterEach, describe, expect, it } from "vitest"

const servers: ReturnType<typeof createServer>[] = []
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  )
})

async function runProbe(options: { omitVary?: boolean; mixBody?: boolean }) {
  const server = createServer((req, res) => {
    const markdown =
      req.url?.endsWith(".md") || req.headers.accept === "text/markdown"
    res.setHeader(
      "content-type",
      markdown ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8",
    )
    res.setHeader("vary", options.omitVary && !markdown ? "RSC" : "Accept, RSC")
    if (markdown) res.setHeader("x-robots-tag", "noindex")
    res.end(
      markdown && !options.mixBody
        ? "# A founder page\n"
        : "<!DOCTYPE html><html><body>A founder page</body></html>",
    )
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string")
    throw new Error("Missing local server address")
  return new Promise<{
    code: number | null
    report: { failures: string[]; results: unknown[] }
  }>((resolve, reject) => {
    const child = spawn(process.execPath, [
      "scripts/check-content-negotiation.mjs",
      "--base",
      `http://127.0.0.1:${address.port}`,
    ])
    let output = ""
    child.stdout.on("data", (chunk) => {
      output += chunk
    })
    child.on("error", reject)
    child.on("close", (code) => {
      try {
        resolve({ code, report: JSON.parse(output) })
      } catch (error) {
        reject(error)
      }
    })
  })
}

describe("content negotiation delivery probe", () => {
  it("checks both warming orders, GET/HEAD, and explicit Markdown URLs", async () => {
    const result = await runProbe({})
    expect(result.code).toBe(0)
    expect(result.report.failures).toEqual([])
    expect(result.report.results).toHaveLength(28)
  })
  it("fails when final HTML drops Accept even though both bodies are correct", async () => {
    const result = await runProbe({ omitVary: true })
    expect(result.code).toBe(1)
    expect(
      result.report.failures.some((failure) =>
        failure.includes("missing Vary: Accept"),
      ),
    ).toBe(true)
  })
  it("detects a mixed representation instead of trusting a 200 or a content-type header", async () => {
    const result = await runProbe({ mixBody: true })
    expect(result.code).toBe(1)
    expect(
      result.report.failures.some((failure) =>
        failure.includes("body is html"),
      ),
    ).toBe(true)
  })
})
