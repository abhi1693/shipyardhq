import AddUserForm from "./form"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Add User",
  section: "Admin",
  description: "Create a new user in the admin panel.",
})

export default function AddUserPage() {
  return <AddUserForm />
}
