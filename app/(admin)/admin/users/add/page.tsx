import { Metadata } from "next"
import AddUserForm from "./form"

export const metadata: Metadata = {
  title: "Add User",
  description: "Create a new user in the admin panel",
}

export default function AddUserPage() {
  return <AddUserForm />
}
