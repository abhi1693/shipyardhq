import { dodoClient } from "@/lib/dodo"
import { fetchDodoCustomerByEmail } from "@/lib/fetchDodoCustomer"
import type Dodo from "dodopayments"

type PortalOpts = { sendEmail?: boolean }

// Create a Dodo customer portal session and return the link
export async function createDodoCustomerPortalLink(
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
