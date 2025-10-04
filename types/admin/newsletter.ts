import { Prisma } from "@/lib/vendor/prisma/client"

export const newsletterSubscriberSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.NewsletterSubscriptionSelect

export const newsletterSubscriberUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect

export type NewsletterSubscriber = Prisma.NewsletterSubscriptionGetPayload<{
  select: typeof newsletterSubscriberSelect
}>

export type NewsletterSubscriberWithUser = NewsletterSubscriber & {
  user: Prisma.UserGetPayload<{
    select: typeof newsletterSubscriberUserSelect
  }> | null
}
