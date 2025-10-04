import { buildPageMetadata } from "@/lib/metadata"

import RuleForm from "../form"

export const metadata = buildPageMetadata({
  title: "Create reward rule",
  section: "Admin",
})

export default function CreateRewardRulePage() {
  return <RuleForm mode="create" />
}
