import AddOrganizationForm from "./form"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Add Organization",
  section: "Admin",
  description: "Create a new organization.",
})

export default function AddOrganizationPage() {
  return <AddOrganizationForm />
}
