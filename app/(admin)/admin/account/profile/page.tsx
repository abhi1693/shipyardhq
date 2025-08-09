import type { Metadata } from "next"
import AdminAccountProfile from "@/components/pages/AdminAccountProfile"

export const metadata: Metadata = {
  title: "Account Profile - Admin",
}

export default function Page() {
  return <AdminAccountProfile />
}
