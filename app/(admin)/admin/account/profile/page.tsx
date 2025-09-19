import AdminAccountProfile from "@/components/pages/AdminAccountProfile"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Account Profile",
  section: "Admin",
})

export default function Page() {
  return <AdminAccountProfile />
}
