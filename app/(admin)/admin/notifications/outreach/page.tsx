import { buildPageMetadata } from "@/lib/metadata"

import BuilderOutreachCenter from "../builder-outreach"

export const metadata = buildPageMetadata({
  title: "Builder outreach",
  section: "Admin",
  description: "Send curated outreach emails to potential builders.",
})

export default function BuilderOutreachPage() {
  return <BuilderOutreachCenter />
}
