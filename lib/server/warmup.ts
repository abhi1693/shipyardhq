import prisma from "@/lib/prisma"
const WARM_SYMBOL = Symbol.for("__shipyard_warmup_promise")

type GlobalWithWarmup = typeof globalThis & {
  [WARM_SYMBOL]?: Promise<void>
}

async function connectPrisma() {
  try {
    await prisma.$connect()
  } catch (error) {
    console.error("[warmup] prisma connect failed", error)
  }
}

function ensureGlobalCache() {
  const globalWithCache = globalThis as unknown as {
    __shipyardActiveUserCache?: Map<string, unknown>
  }
  if (!globalWithCache.__shipyardActiveUserCache) {
    globalWithCache.__shipyardActiveUserCache = new Map()
  }
}

export async function warmServer(): Promise<void> {
  if (typeof window !== "undefined") return

  const globalWithWarmup = globalThis as GlobalWithWarmup
  if (!globalWithWarmup[WARM_SYMBOL]) {
    globalWithWarmup[WARM_SYMBOL] = connectPrisma()
      .finally(() => ensureGlobalCache())
      .catch((error) => {
        console.error("[warmup] failed", error)
      })
  }

  await globalWithWarmup[WARM_SYMBOL]
}
