import { describe, expect, it, vi, afterEach } from "vitest"

import { fetchCarbonAd, parseCarbonCreative } from "@/lib/ads/creative"

const creative = {
  statlink: "//srv.buysellads.com/ads/click/example?t=[timestamp]",
  image: "https://cdn4.buysellads.net/creative.png",
  description: "Build &amp; ship &lt;strong&gt;today&lt;/strong&gt;",
  timestamp: "12345",
}

afterEach(() => {
  vi.unstubAllGlobals()
  history.replaceState(null, "", "/")
})

describe("Carbon creative templates", () => {
  it("preserves the tracked click destination and renders decoded copy as text", () => {
    const ad = parseCarbonCreative({ ads: [creative, {}] })!
    expect(ad.link).toBe("https://srv.buysellads.com/ads/click/example?t=12345")
    expect(ad.description).toBe("Build & ship <strong>today</strong>")
    expect(ad.company).toBe("")
    expect(ad.pixels).toEqual([])
  })

  it.each([
    ["image-text", { smallImage: "https://cdn4.buysellads.net/130x100.png" }],
    ["native-icon", { image: "https://cdn4.buysellads.net/80x80.png" }],
    ["logo-text", { logo: "https://cdn4.buysellads.net/250x100.png" }],
    [
      "rich",
      {
        largeImage: "https://cdn4.buysellads.net/large.png",
        logo: "https://cdn4.buysellads.net/logo.png",
        company: "Sponsor",
        companyTagline: "Build something",
      },
    ],
    ["text", { company: "Sponsor" }],
  ])("selects the %s template from its own asset fields", (kind, assets) => {
    const ad = parseCarbonCreative({
      ads: [{ ...creative, image: undefined, ...assets }],
    })!
    expect(ad.visual).toMatchObject({ kind })
  })

  it("uses Carbon's image/text asset when the response also contains a native icon", () => {
    const smallImage = "https://cdn4.buysellads.net/130x100.png"
    const ad = parseCarbonCreative({ ads: [{ ...creative, smallImage }] })!
    expect(ad.visual).toEqual({ kind: "image-text", smallImage })
  })

  it("rejects no-fill, malformed responses, and executable creative URLs", () => {
    for (const response of [
      null,
      {},
      { ads: [] },
      { ads: [{}] },
      { ads: [{ ...creative, statlink: "javascript:alert(1)" }] },
      { ads: [{ ...creative, image: "data:text/html,unsafe" }] },
    ]) {
      expect(parseCarbonCreative(response)).toBeNull()
    }
  })

  it("expands campaign pixels and only enables explicitly requested viewability", () => {
    const data = {
      ...creative,
      pixel:
        "https://example.com/one?t=[timestamp]||javascript:alert(1)||https://example.com/two",
      statview: "https://srv.buysellads.com/ads/viewable/test",
      should_record_viewable: "0",
    }
    const ad = parseCarbonCreative({ ads: [data] })!
    expect(ad.pixels).toEqual([
      "https://example.com/one?t=12345",
      "https://example.com/two",
    ])
    expect(ad.viewUrl).toBeUndefined()
    const tracked = parseCarbonCreative({
      ads: [{ ...data, should_record_viewable: "1" }],
    })!
    expect(new URL(tracked.viewUrl!).searchParams.get("segment")).toBe(
      "placement:shipyardhqdev",
    )
    expect(data.statview).toBe("https://srv.buysellads.com/ads/viewable/test")
  })

  it("makes a non-cached browser request and passes preview flags without inventing an IP", async () => {
    history.replaceState(null, "", "/browse?bsaignore=yes&bsaforcebanner=123")
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ads: [creative] }) })
    vi.stubGlobal("fetch", fetcher)
    const signal = new AbortController().signal
    await fetchCarbonAd(signal, "feed")
    const [url, options] = fetcher.mock.calls[0]
    expect(url.searchParams.get("ignore")).toBe("yes")
    expect(url.searchParams.get("forcebanner")).toBe("123")
    expect(url.searchParams.get("useragent")).toBe(navigator.userAgent)
    expect(url.searchParams.has("forwardedip")).toBe(false)
    expect(options).toMatchObject({
      signal,
      cache: "no-store",
      credentials: "omit",
    })
  })
})
