import { dodoClient } from "@/lib/dodo"
import type Dodo from "dodopayments"

// Fetch a Dodo customer by email (returns the first match or null)
export async function fetchDodoCustomerByEmail(
  email: string,
): Promise<Dodo.Customers.Customer | null> {
  if (!email) return null
  try {
    const page = await dodoClient.customers.list({ email, page_size: 1 } as any)
    const items = (page as any)?.items as Dodo.Customers.Customer[] | undefined
    return (items && items[0]) || null
  } catch {
    // Swallow not-found or API errors and return null for convenience
    return null
  }
}
