import { Metadata } from "next"
import AddBadgeForm from "./form"

export const metadata: Metadata = {
  title: "Add Badge",
  description: "Create a new badge to assign to products",
}

export default function AddBadgePage() {
  return <AddBadgeForm />
}
