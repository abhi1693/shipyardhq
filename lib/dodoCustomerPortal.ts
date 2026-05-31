import { dodoClient } from "@/lib/dodo"
import { fetchDodoCustomerByEmail } from "@/lib/fetchDodoCustomer"
import type Dodo from "dodopayments"

// Create a Dodo billing portal (customer portal) session and return the link
async function createDodoCustomerPortalLink(
  customerId: string,
): Promise<string | null> {
  if (!customerId) return null
  try {
    const session = await dodoClient.customers.customerPortal.create(customerId)
    const link = (session as Dodo.Customers.CustomerPortalSession).link
    return link || null
  } catch {
    return null
  }
}

// Resolve a customer by email, then create a portal session link
export async function createDodoCustomerPortalLinkByEmail(
  email: string,
): Promise<string | null> {
  if (!email) return null
  const customer = await fetchDodoCustomerByEmail(email)
  if (!customer) return null
  return createDodoCustomerPortalLink(customer.customer_id)
}

export async function canOpenDodoBillingPortalByEmail(
  email: string,
): Promise<boolean> {
  if (!email) return false
  const customer = await fetchDodoCustomerByEmail(email)
  return Boolean(customer?.customer_id)
}
