import { afterEach, describe, expect, it, vi } from "vitest"

const dnsMocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  resolveTxt: vi.fn(),
  setServers: vi.fn(),
}))

vi.mock("node:dns/promises", () => {
  class MockResolver {
    cancel = dnsMocks.cancel
    resolveTxt = dnsMocks.resolveTxt
    setServers = dnsMocks.setServers
  }

  return {
    default: { Resolver: MockResolver },
    Resolver: MockResolver,
  }
})

import { resolveTxtRecords } from "@/lib/server/dns"

afterEach(() => {
  vi.useRealTimers()
})

describe("resolveTxtRecords", () => {
  it("inherits the runtime DNS servers instead of forcing public resolvers", async () => {
    dnsMocks.resolveTxt.mockResolvedValue([
      ["prod-verif-shipyard-example"],
    ])

    await expect(resolveTxtRecords("example.com")).resolves.toEqual([
      ["prod-verif-shipyard-example"],
    ])

    expect(dnsMocks.resolveTxt).toHaveBeenCalledWith("example.com")
    expect(dnsMocks.setServers).not.toHaveBeenCalled()
  })

  it("returns TXT records from an injected resolver", async () => {
    const resolveTxt = vi
      .fn()
      .mockResolvedValue([["prod-verif-shipyard-example"]])
    const cancel = vi.fn()

    await expect(
      resolveTxtRecords("example.com", {
        resolver: { resolveTxt, cancel },
      }),
    ).resolves.toEqual([["prod-verif-shipyard-example"]])

    expect(resolveTxt).toHaveBeenCalledWith("example.com")
    expect(cancel).not.toHaveBeenCalled()
  })

  it("cancels a DNS query and reports ETIMEOUT when it exceeds the limit", async () => {
    vi.useFakeTimers()
    const resolveTxt = vi.fn(() => new Promise<string[][]>(() => undefined))
    const cancel = vi.fn()
    const lookup = resolveTxtRecords("example.com", {
      resolver: { resolveTxt, cancel },
      timeoutMs: 25,
    })

    const rejection = expect(lookup).rejects.toMatchObject({
      code: "ETIMEOUT",
      message: "DNS lookup timed out",
    })
    await vi.advanceTimersByTimeAsync(25)

    await rejection
    expect(cancel).toHaveBeenCalledOnce()
  })

  it("preserves DNS errors returned before the timeout", async () => {
    const dnsError = Object.assign(new Error("queryTxt ENOTFOUND example.com"), {
      code: "ENOTFOUND",
    })
    const resolveTxt = vi.fn().mockRejectedValue(dnsError)
    const cancel = vi.fn()

    await expect(
      resolveTxtRecords("example.com", {
        resolver: { resolveTxt, cancel },
      }),
    ).rejects.toBe(dnsError)

    expect(cancel).not.toHaveBeenCalled()
  })
})
