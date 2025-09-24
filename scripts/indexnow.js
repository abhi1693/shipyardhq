/* eslint-disable @typescript-eslint/no-require-imports */
const axios = require("axios")
const { parseStringPromise } = require("xml2js")

const HOST = "shipyardhq.dev"
const SITEMAP_URL = `https://${HOST}/sitemap.xml`
const KEY = "2778804c48ba41b9bf63c3f18ac2220c"
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`

const SEARCH_ENGINES_URL = "https://www.indexnow.org/searchengines.json"

const FETCH_TIMEOUT_MS = Number(process.env.INDEXNOW_FETCH_TIMEOUT_MS) || 10000
const MAX_FETCH_ATTEMPTS = Number(process.env.INDEXNOW_FETCH_ATTEMPTS) || 3
const BASE_RETRY_DELAY_MS = Number(process.env.INDEXNOW_RETRY_DELAY_MS) || 2000
const USER_AGENT = process.env.INDEXNOW_USER_AGENT || "ShipyardHQ-IndexNow/1.0"

const LASTMOD_THRESHOLD_DAYS = process.env.LASTMOD_THRESHOLD_DAYS || 7

function isRecentlyModified(lastmod) {
  if (!lastmod) return false

  try {
    const lastmodDate = new Date(lastmod)
    const now = new Date()
    const diffMs = now - lastmodDate
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays <= LASTMOD_THRESHOLD_DAYS
  } catch {
    return false
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRetryAfterMs(value) {
  if (!value) return null

  const asNumber = Number(value)
  if (!Number.isNaN(asNumber) && asNumber >= 0) {
    return asNumber * 1000
  }

  const asDate = Date.parse(value)
  if (!Number.isNaN(asDate)) {
    const delay = asDate - Date.now()
    return delay > 0 ? delay : null
  }

  return null
}

async function axiosGetWithRetries(
  url,
  config = {},
  attempts = MAX_FETCH_ATTEMPTS,
) {
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (attempt === 1) {
      console.info(`[INFO] Fetching ${url}`)
    } else {
      console.info(`[INFO] Retrying ${url} (attempt ${attempt} of ${attempts})`)
    }
    try {
      const result = await axios.get(url, config)
      if (attempt > 1) {
        console.info(`[INFO] Fetched ${url} on retry attempt ${attempt}`)
      }
      return result
    } catch (err) {
      lastError = err

      const status = err?.response?.status
      const retryAfterHeader = err?.response?.headers?.["retry-after"]
      const retryableStatus = status === 429 || (status >= 500 && status < 600)
      const isTimeout = err?.code === "ECONNABORTED"
      const canRetry = attempt < attempts && (retryableStatus || isTimeout)

      if (!canRetry) {
        break
      }

      const retryAfterMs = parseRetryAfterMs(retryAfterHeader)
      const backoffMs = retryAfterMs ?? BASE_RETRY_DELAY_MS * attempt

      const reason = status ? `status ${status}` : err.message
      console.warn(
        `[WARN] Attempt ${attempt} to fetch ${url} failed (${reason}); retrying in ${backoffMs}ms`,
      )
      await sleep(backoffMs)
    }
  }

  throw lastError
}

async function fetchRecentUrlsFromSitemap(url) {
  const visitedSitemaps = new Set()
  const collectedUrls = new Set()
  let hadErrors = false

  async function traverseSitemap(currentUrl) {
    if (!currentUrl || visitedSitemaps.has(currentUrl)) return
    visitedSitemaps.add(currentUrl)

    let parsed
    try {
      const response = await axiosGetWithRetries(
        currentUrl,
        {
          timeout: FETCH_TIMEOUT_MS,
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/xml,text/xml,application/xhtml+xml",
          },
        },
        MAX_FETCH_ATTEMPTS,
      )
      parsed = await parseStringPromise(response.data, { trim: true })
    } catch (err) {
      hadErrors = true
      console.error(
        `[ERROR] Failed to fetch or parse sitemap ${currentUrl}: ${err.message}`,
      )
      return
    }

    const urlEntries = parsed?.urlset?.url || []
    for (const entry of urlEntries) {
      const loc = entry?.loc?.[0]?.trim()
      if (!loc) continue
      if (!isRecentlyModified(entry?.lastmod?.[0])) continue
      collectedUrls.add(loc)
    }

    const childSitemaps = parsed?.sitemapindex?.sitemap || []
    console.info(
      `[INFO] Processed sitemap ${currentUrl}; ${urlEntries.length} urls, ${childSitemaps.length} child sitemaps`,
    )
    for (const entry of childSitemaps) {
      const loc = entry?.loc?.[0]?.trim()
      if (!loc) continue
      await traverseSitemap(loc)
    }
  }

  await traverseSitemap(url)
  return {
    urls: Array.from(collectedUrls),
    hadErrors,
  }
}

async function fetchIndexNowEndpoints() {
  let engineDirectory
  try {
    const response = await axios.get(SEARCH_ENGINES_URL, { timeout: 10000 })
    engineDirectory = response.data
  } catch (err) {
    console.error(
      `[ERROR] Failed to fetch IndexNow search engine directory: ${err.message}`,
    )
    return []
  }

  if (!engineDirectory || typeof engineDirectory !== "object") {
    console.warn(
      `[WARN] Unexpected response from IndexNow search engine directory; received ${typeof engineDirectory}.`,
    )
    return []
  }

  const entries = Object.entries(engineDirectory).filter(
    ([, metaUrl]) => typeof metaUrl === "string" && metaUrl.trim().length > 0,
  )

  if (!entries.length) {
    console.warn(
      `[WARN] IndexNow directory did not include any meta endpoints.`,
    )
    return []
  }

  const endpoints = new Set()
  console.info(
    `[INFO] Resolving IndexNow meta manifests for ${entries.length} engines...`,
  )
  const requests = await Promise.allSettled(
    entries.map(([, metaUrl]) =>
      axios.get(metaUrl, {
        timeout: 15000,
      }),
    ),
  )

  requests.forEach((result, index) => {
    const [engineId, metaUrl] = entries[index]
    if (result.status === "fulfilled") {
      const apiEndpoint = result.value?.data?.api
      if (typeof apiEndpoint === "string" && apiEndpoint.trim().length > 0) {
        endpoints.add(apiEndpoint.trim())
      } else {
        console.warn(
          `[WARN] Meta response for ${engineId} at ${metaUrl} did not include an API endpoint.`,
        )
      }
    } else {
      const reason = result.reason
      const message =
        typeof reason === "object" && reason?.message ? reason.message : reason
      console.error(
        `[ERROR] Failed to fetch meta for ${engineId} at ${metaUrl}: ${message}`,
      )
    }
  })

  if (!endpoints.size) {
    console.warn(
      `[WARN] Unable to resolve any IndexNow endpoints from directory.`,
    )
    return []
  }

  const resolved = Array.from(endpoints)
  console.info(`[INFO] Resolved ${resolved.length} IndexNow endpoints.`)
  return resolved
}

async function submitUrlsViaPost(urls, endpoints) {
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  }

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
  }

  let successCount = 0
  let failureCount = 0
  const failures = []

  for (const endpoint of endpoints) {
    try {
      const res = await axios.post(endpoint, payload, {
        headers,
        timeout: 10000,
      })
      console.log(`[POST] ${endpoint} => ${res.status}`)
      if (res.status !== 200) {
        console.log(`[POST] Response body: ${JSON.stringify(res.data)}`)
        failureCount += 1
        failures.push(`${endpoint} (${res.status})`)
      } else {
        successCount += 1
      }
    } catch (err) {
      console.error(`[ERROR] POST to ${endpoint} failed: ${err.message}`)
      failureCount += 1
      failures.push(`${endpoint} (${err.message})`)
    }
  }

  console.log(`[INFO] Total URLs submitted: ${urls.length}`)
  console.log(
    `[INFO] Submission summary: ${successCount} success, ${failureCount} failed.`,
  )
  if (failures.length) {
    console.warn(`[WARN] Failed endpoints: ${failures.join(", ")}`)
  }
}

;(async function main() {
  const urls = await fetchRecentUrlsFromSitemap(SITEMAP_URL)

  console.info(
    `[INFO] Collected ${urls.urls.length} recently updated URLs from sitemap (errors: ${urls.hadErrors})`,
  )

  if (urls.hadErrors && !urls.urls.length) {
    console.error(
      "[ERROR] Failed to resolve any URLs due to repeated sitemap fetch errors; aborting submission.",
    )
    return
  }

  if (!urls.urls.length) {
    console.warn("[WARN] No recently updated URLs found.")
    return
  }

  const endpoints = await fetchIndexNowEndpoints()

  if (!endpoints.length) {
    console.warn("[WARN] No IndexNow endpoints resolved; skipping submission.")
    return
  }

  console.log(
    `[INFO] Submitting ${urls.urls.length} recent URLs to ${endpoints.length} IndexNow endpoints via POST...`,
  )
  await submitUrlsViaPost(urls.urls, endpoints)
})()
