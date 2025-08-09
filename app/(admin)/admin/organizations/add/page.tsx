import { Metadata } from "next"
import AddOrganizationForm from "./form"

export const metadata: Metadata = {
  title: "Add Organization",
  description: "Create a new organization",
}

export default function AddOrganizationPage() {
  return <AddOrganizationForm />
}

