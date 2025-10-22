import { MemberOverviewPageContent } from "@/components/templates/member/overview/page-content"

export const dynamic = "force-dynamic"

export default function OverviewPage(
  props: Parameters<typeof MemberOverviewPageContent>[0],
) {
  return <MemberOverviewPageContent {...props} />
}
