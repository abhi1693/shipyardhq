import { dodoClient } from "@/lib/dodo"
import { fetchDodoCustomerByEmail } from "@/lib/fetchDodoCustomer"
import {
  buildCacheKey,
  cacheHit,
  cacheMiss,
} from "@/lib/server/cache"
import type Dodo from "dodopayments"

type PortalOpts = { sendEmail?: boolean }

type BillingPortalEligibilityEntry = {
  value: boolean
  generatedAt: number
}

const BILLING_PORTAL_CACHE_NAMESPACE = "dodoBillingPortalEligibility"
const BILLING_PORTAL_CACHE_MAX_AGE_MS = 30 * 60 * 1000 // 30 minutes
const BILLING_PORTAL_CACHE_STALE_AFTER_MS = 5 * 60 * 1000 // 5 minutes
const BILLING_PORTAL_CACHE_TTL_SECONDS = Math.ceil(
  BILLING_PORTAL_CACHE_MAX_AGE_MS / 1000,
)

const globalForBillingPortal = globalThis as unknown as {
  __billingPortalEligibilityCache?: Map<string, BillingPortalEligibilityEntry>
  __billingPortalEligibilityPromises?: Map<string, Promise<boolean>>
}

function getEligibilityCache() {
  if (!globalForBillingPortal.__billingPortalEligibilityCache) {
    globalForBillingPortal.__billingPortalEligibilityCache = new Map()
  }
  return globalForBillingPortal.__billingPortalEligibilityCache
}

function getEligibilityPromiseMap() {
  if (!globalForBillingPortal.__billingPortalEligibilityPromises) {
    globalForBillingPortal.__billingPortalEligibilityPromises = new Map()
  }
  return globalForBillingPortal.__billingPortalEligibilityPromises
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function setLocalEligibility(email: string, entry: BillingPortalEligibilityEntry) {
  getEligibilityCache().set(email, entry)
}

function getFreshLocalEligibility(email: string) {
  const local = getEligibilityCache().get(email)
  if (!local) return null
  if (Date.now() - local.generatedAt > BILLING_PORTAL_CACHE_MAX_AGE_MS) {
    return null
  }
  return local
}

function buildEligibilityCacheKey(email: string) {
  return buildCacheKey(BILLING_PORTAL_CACHE_NAMESPACE, email)
}

async function readEligibilityCache(email: string) {
  return cacheHit<BillingPortalEligibilityEntry>({
    key: buildEligibilityCacheKey(email),
    onError: (error) => {
      console.error("[billing] failed to read portal eligibility cache", {
        email,
        error,
      })
    },
  })
}

async function writeEligibilityCache(
  email: string,
  entry: BillingPortalEligibilityEntry,
) {
  return cacheMiss({
    key: buildEligibilityCacheKey(email),
    value: entry,
    ttlSeconds: BILLING_PORTAL_CACHE_TTL_SECONDS,
    onError: (error) => {
      console.error("[billing] failed to write portal eligibility cache", {
        email,
        error,
      })
    },
  })
}

async function fetchEligibility(email: string): Promise<boolean> {
  try {
    const customer = await fetchDodoCustomerByEmail(email)
    return Boolean(customer?.customer_id)
  } catch (error) {
    console.error("[billing] failed to fetch eligibility from Dodo", {
      email,
      error,
    })
    return false
  }
}

async function refreshEligibility(email: string) {
  const promiseMap = getEligibilityPromiseMap()
  if (promiseMap.has(email)) {
    return promiseMap.get(email)!
  }
  const refreshPromise = (async () => {
    const value = await fetchEligibility(email)
    const entry: BillingPortalEligibilityEntry = {
      value,
      generatedAt: Date.now(),
    }
    setLocalEligibility(email, entry)
    await writeEligibilityCache(email, entry)
    return value
  })().finally(() => {
    promiseMap.delete(email)
  })
  promiseMap.set(email, refreshPromise)
  return refreshPromise
}

export async function getCachedBillingPortalEligibility(
  email: string,
): Promise<boolean> {
  if (!email) return false

  const normalized = normalizeEmail(email)
  const now = Date.now()
  const local = getFreshLocalEligibility(normalized)

  if (local) {
    if (now - local.generatedAt >= BILLING_PORTAL_CACHE_STALE_AFTER_MS) {
      void refreshEligibility(normalized)
    }
    return local.value
  }

  const cached = await readEligibilityCache(normalized)
  if (cached) {
    setLocalEligibility(normalized, cached)
    if (now - cached.generatedAt >= BILLING_PORTAL_CACHE_STALE_AFTER_MS) {
      void refreshEligibility(normalized)
    }
    return cached.value
  }

  void refreshEligibility(normalized)
  return false
}

export async function ensureBillingPortalEligibility(email: string) {
  if (!email) return
  await refreshEligibility(normalizeEmail(email))
}

// Create a Dodo billing portal (customer portal) session and return the link
async function createDodoCustomerPortalLink(
  customerId: string,
  opts: PortalOpts = {},
): Promise<string | null> {
  if (!customerId) return null
  try {
    const params = opts.sendEmail ? { send_email: true } : {}
    const session = await dodoClient.customers.customerPortal.create(
      customerId,
      params as any,
    )
    const link = (session as Dodo.Customers.CustomerPortalSession).link
    return link || null
  } catch {
    return null
  }
}

// Resolve a customer by email, then create a portal session link
export async function createDodoCustomerPortalLinkByEmail(
  email: string,
  opts: PortalOpts = {},
): Promise<string | null> {
  if (!email) return null
  const customer = await fetchDodoCustomerByEmail(email)
  if (!customer) return null
  return createDodoCustomerPortalLink(customer.customer_id, opts)
}
