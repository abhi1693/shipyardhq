import type { Metadata } from "next"
import MemberAccountProfile from "@/components/pages/MemberAccountProfile"

export const metadata: Metadata = {
  title: "Account Profile - Member",
}

export default function Page() {
  return <MemberAccountProfile />
}

