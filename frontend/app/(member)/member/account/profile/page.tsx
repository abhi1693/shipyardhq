import MemberAccountProfile from "@/components/pages/MemberAccountProfile"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Account Profile",
})

export default function Page() {
  return <MemberAccountProfile />
}
