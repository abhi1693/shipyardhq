import AddNewsletterSubscriberForm from "./form"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Add Newsletter Subscriber",
  section: "Admin",
  description: "Add a manual newsletter subscriber record.",
})

export default function AddNewsletterSubscriberPage() {
  return <AddNewsletterSubscriberForm />
}
