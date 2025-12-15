import type { Prisma } from "@/lib/vendor/prisma/client"

export type ProductForEditWizard = Prisma.ProductGetPayload<{
  select: {
    id: true
    slug: true
    userId: true
    name: true
    tagline: true
    description: true
    websiteUrl: true
    logo: true
    categoryId: true
    type: true
    pricingModel: true
    startingPriceCents: true
    currencyCode: true
    platforms: true
    keywords: true
    organizationId: true
    bannerImage: true
    status: true
    metadata: {
      select: {
        githubUrl: true
        twitterUrl: true
        demoUrl: true
        contactEmail: true
        utmCampaign: true
      }
    }
    alternatives: { select: { id: true } }
    ProductMedia: { select: { id: true; imageUrl: true } }
    verification: { select: { isVerified: true } }
    user: { select: { clerkId: true } }
  }
}>

