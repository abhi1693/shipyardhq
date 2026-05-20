import { redirect } from "next/navigation"

import { adminPath } from "@/lib/routes"

export const dynamic = "force-dynamic"

export default function DeprecatedRevenueAnalyticsPage() {
  redirect(adminPath("analytics", "traffic"))
}
