const { google } = require("googleapis")
const path = require("path")
const axios = require("axios")
const { parseStringPromise } = require("xml2js")

const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:shipyardhq.dev"
const ROOT_SITEMAP_URL =
  process.env.ROOT_SITEMAP_URL || "https://shipyardhq.dev/sitemap.xml"
const FETCH_TIMEOUT_MS = Number(process.env.SITEMAP_FETCH_TIMEOUT_MS || 10000)

function resolveSitemapUrl(loc, parentUrl) {
  if (!loc) return null

  try {
    return new URL(loc.trim(), parentUrl).href
  } catch (error) {
    console.error(`⚠️  Invalid sitemap URL discovered: ${loc}`, error.message)
    return null
  }
}

async function discoverSitemaps(rootUrl) {
  const discovered = new Set()

  async function traverse(url) {
    if (!url || discovered.has(url)) return
    discovered.add(url)

    try {
      const response = await axios.get(url, { timeout: FETCH_TIMEOUT_MS })
      const parsed = await parseStringPromise(response.data, { trim: true })

      const indexEntries = parsed?.sitemapindex?.sitemap || []
      for (const entry of indexEntries) {
        const nextUrl = resolveSitemapUrl(entry?.loc?.[0], url)
        if (!nextUrl) continue
        await traverse(nextUrl)
      }
    } catch (error) {
      console.error(`⚠️  Skipping ${url}: ${error.message}`)
    }
  }

  await traverse(rootUrl)
  return Array.from(discovered)
}

async function submitSitemaps() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, "service-account.json"),
    scopes: ["https://www.googleapis.com/auth/webmasters"],
  })

  const authClient = await auth.getClient()
  const searchconsole = google.webmasters({ version: "v3", auth: authClient })

  const sitemapUrls = await discoverSitemaps(ROOT_SITEMAP_URL)

  if (!sitemapUrls.length) {
    console.error("❌ No sitemaps discovered to submit.")
    return
  }

  console.log(`📄 Discovered ${sitemapUrls.length} sitemap(s).`)

  for (const sitemapUrl of sitemapUrls) {
    try {
      await searchconsole.sitemaps.submit({
        siteUrl: SITE_URL,
        feedpath: sitemapUrl,
      })
      console.log(`✅ Submitted: ${sitemapUrl}`)
    } catch (error) {
      console.error(
        `❌ Failed to submit ${sitemapUrl}:`,
        error.errors || error.message,
      )
    }
  }
}

submitSitemaps().catch((error) => {
  console.error("❌ Unexpected error submitting sitemaps:", error)
  process.exitCode = 1
})
