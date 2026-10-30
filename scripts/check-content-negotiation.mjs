import { createHash } from "node:crypto"

const args = process.argv.slice(2)
const baseIndex = args.indexOf("--base")
const base = new URL(
  baseIndex >= 0 ? args[baseIndex + 1] : "https://shipyardhq.dev",
)
if (
  base.username ||
  base.password ||
  base.search ||
  base.hash ||
  !["http:", "https:"].includes(base.protocol)
)
  throw new Error(
    "Use a plain HTTP(S) origin without credentials or query parameters",
  )
const reportOnly = args.includes("--report-only")
const results = []
const failures = []

async function check(
  path,
  representation,
  method = "GET",
  phase = "warm-sequence",
) {
  const response = await fetch(new URL(path, base.origin), {
    method,
    headers: {
      Accept: representation === "html" ? "text/html" : "text/markdown",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  })
  const body = method === "HEAD" ? "" : await response.text()
  const type = response.headers.get("content-type") ?? ""
  const robots = response.headers.get("x-robots-tag") ?? ""
  const vary = response.headers.get("vary") ?? ""
  const varyTokens = vary
    .toLowerCase()
    .split(",")
    .map((value) => value.trim())
  const expectedType = representation === "html" ? "text/html" : "text/markdown"
  const observedBody =
    method === "HEAD"
      ? null
      : /^\s*(?:<!doctype\s+html|<html)/i.test(body)
        ? "html"
        : /^\s*#\s/.test(body)
          ? "markdown"
          : "unknown"
  const result = {
    path,
    phase,
    method,
    representation,
    status: response.status,
    contentType: type,
    robots,
    vary,
    cacheControl: response.headers.get("cache-control"),
    cfCacheStatus: response.headers.get("cf-cache-status"),
    observedBody,
    bodySha256: body ? createHash("sha256").update(body).digest("hex") : null,
  }
  results.push(result)
  const fail = (message) =>
    failures.push(`${method} ${path} (${representation}, ${phase}): ${message}`)
  if (response.status !== 200) fail(`expected 200; received ${response.status}`)
  if (!type.toLowerCase().startsWith(expectedType))
    fail(`unexpected content type ${type}`)
  if (method !== "HEAD" && observedBody !== representation)
    fail(`body is ${observedBody}`)
  if (representation === "markdown" && !/\bnoindex\b/i.test(robots))
    fail("Markdown is missing noindex")
  if (representation === "html" && /\bnoindex\b/i.test(robots))
    fail("HTML has a leaked noindex header")
  if (
    !path.endsWith(".md") &&
    !varyTokens.includes("accept") &&
    !varyTokens.includes("*")
  )
    fail("negotiated response is missing Vary: Accept")
  return result
}

for (const path of ["/why-shipyard", "/pricing"]) {
  for (const [phase, sequence] of [
    ["html-first", ["html", "markdown", "markdown", "html"]],
    ["markdown-first", ["markdown", "html", "html", "markdown"]],
  ]) {
    for (const representation of sequence)
      await check(path, representation, "GET", phase)
  }
  for (const representation of ["html", "markdown"]) {
    const get = await check(path, representation, "GET", "head-parity")
    const head = await check(path, representation, "HEAD", "head-parity")
    if (get.contentType !== head.contentType || get.robots !== head.robots)
      failures.push(
        `${path} (${representation}): GET/HEAD content type or robots differs`,
      )
  }
  await check(`${path}.md`, "markdown", "GET", "explicit-md")
  await check(`${path}.md`, "markdown", "HEAD", "explicit-md")
}
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      origin: base.origin,
      results,
      failures,
      note: "Correct bodies and DYNAMIC responses do not establish CDN cache-key separation. Missing Vary remains a contract failure.",
    },
    null,
    2,
  ),
)
if (failures.length && !reportOnly) process.exitCode = 1
