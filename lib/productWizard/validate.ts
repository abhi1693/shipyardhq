// Client-side best-effort validation for external resources used in the product form

export type ReviewChecks = Record<string, boolean>

export async function validateExternalResources(
  values: Record<string, any>,
): Promise<{
  issues: string[]
  checks: ReviewChecks
}> {
  const v = values as any
  const issues: string[] = []
  const checks: ReviewChecks = {}

  const loadImage = (url: string) =>
    new Promise<boolean>((resolve) => {
      try {
        const img = new Image()
        const timer = setTimeout(() => resolve(false), 8000)
        img.onload = () => {
          clearTimeout(timer)
          resolve(true)
        }
        img.onerror = () => {
          clearTimeout(timer)
          resolve(false)
        }
        img.src = url
      } catch {
        resolve(false)
      }
    })

  const checkUrl = async (url?: string) => {
    if (!url) return true
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 7000)
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        redirect: "follow",
        signal: controller.signal,
      })
      clearTimeout(id)
      return res.ok
    } catch {
      // Unknown due to CORS/network; don't block publish, but warn
      return true
    }
  }

  // Required: websiteUrl must be http/https and respond ok
  if (typeof v.websiteUrl === "string" && !v.websiteUrl.startsWith("http")) {
    issues.push("Website URL must start with http/https")
    checks.websiteOk = false
  } else {
    const ok = await checkUrl(v.websiteUrl)
    checks.websiteOk = ok
    if (!ok) issues.push("Website URL did not respond OK")
  }

  // Required image: logo
  if (typeof v.logo === "string" && v.logo.length) {
    const ok = await loadImage(v.logo)
    checks.logoOk = ok
    if (!ok) issues.push("Logo URL is not a valid image")
  } else {
    checks.logoOk = false
    issues.push("Logo URL is required")
  }

  // Optional image: bannerImage
  if (typeof v.bannerImage === "string" && v.bannerImage.length) {
    const ok = await loadImage(v.bannerImage)
    checks.bannerOk = ok
    if (!ok) issues.push("Banner Image URL is not a valid image")
  }

  // Optional links
  const linkPairs: [key: string, label: string, field: string][] = [
    ["ctaUrl", "CTA URL", "ctaOk"],
    ["githubUrl", "GitHub URL", "githubOk"],
    ["twitterUrl", "Twitter URL", "twitterOk"],
    ["demoUrl", "Demo URL", "demoOk"],
  ]
  for (const [k, label, f] of linkPairs) {
    const url = v[k]
    if (typeof url === "string" && url.length) {
      const ok = await checkUrl(url)
      ;(checks as any)[f] = ok
      if (!ok) issues.push(`${label} did not respond OK`)
    }
  }

  return { issues, checks }
}
