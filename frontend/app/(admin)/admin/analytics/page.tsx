import { redirect } from "next/navigation"
import { adminPath } from "@/lib/routes"

export default function AnalyticsIndexPage() {
  redirect(adminPath("analytics", "traffic"))
}
