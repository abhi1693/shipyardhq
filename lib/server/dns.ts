import { Resolver } from "node:dns/promises"

export const DNS_LOOKUP_TIMEOUT_MS = 5_000

type TxtResolver = Pick<Resolver, "cancel" | "resolveTxt">

interface ResolveTxtRecordsOptions {
  resolver?: TxtResolver
  timeoutMs?: number
}

function dnsTimeoutError() {
  const error = new Error("DNS lookup timed out") as NodeJS.ErrnoException
  error.code = "ETIMEOUT"
  return error
}

export async function resolveTxtRecords(
  domain: string,
  {
    resolver = new Resolver(),
    timeoutMs = DNS_LOOKUP_TIMEOUT_MS,
  }: ResolveTxtRecordsOptions = {},
) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      resolver.resolveTxt(domain),
      new Promise<string[][]>((_, reject) => {
        timeout = setTimeout(() => {
          resolver.cancel()
          reject(dnsTimeoutError())
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}
