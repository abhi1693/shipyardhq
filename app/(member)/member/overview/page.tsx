import { auth } from "@clerk/nextjs/server"

import { MemberOverviewPageContent } from "@/components/templates/member/overview/page-content"

export default async function OverviewPage() {
  await auth.protect()

  return <MemberOverviewPageContent />
}
