const axios = require("axios")
const { parseStringPromise } = require("xml2js")

const HOST = "shipyardhq.dev"
const SITEMAP_URL = `https://${HOST}/sitemap.xml`
const KEY = "2778804c48ba41b9bf63c3f18ac2220c"
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`

const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
]

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

async function fetchRecentUrlsFromSitemap(url) {
  const visitedSitemaps = new Set()
  const collectedUrls = new Set()

  async function traverseSitemap(currentUrl) {
    if (!currentUrl || visitedSitemaps.has(currentUrl)) return
    visitedSitemaps.add(currentUrl)

    let parsed
    try {
      const response = await axios.get(currentUrl, { timeout: 10000 })
      parsed = await parseStringPromise(response.data, { trim: true })
    } catch (err) {
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
    for (const entry of childSitemaps) {
      const loc = entry?.loc?.[0]?.trim()
      if (!loc) continue
      await traverseSitemap(loc)
    }
  }

  await traverseSitemap(url)
  return Array.from(collectedUrls)
}

async function submitUrlsViaPost(urls) {
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  }

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
  }

  for (const endpoint of INDEXNOW_ENDPOINTS) {
    try {
      const res = await axios.post(endpoint, payload, {
        headers,
        timeout: 10000,
      })
      console.log(`[POST] ${endpoint} => ${res.status}`)
      if (res.status !== 200) {
        console.log(`[POST] Response body: ${JSON.stringify(res.data)}`)
      }
    } catch (err) {
      console.error(`[ERROR] POST to ${endpoint} failed: ${err.message}`)
    }
  }

  console.log(`[INFO] Total URLs submitted: ${urls.length}`)
}

;(async function main() {
  const urls = await fetchRecentUrlsFromSitemap(SITEMAP_URL)

  if (!urls.length) {
    console.warn("[WARN] No recently updated URLs found.")
    return
  }

  console.log(
    `[INFO] Submitting ${urls.length} recent URLs to IndexNow via POST...`,
  )
  await submitUrlsViaPost(urls)
})()
