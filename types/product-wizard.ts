import type { Prisma } from "@/lib/vendor/prisma/client"

export type ProductWizardCategoryOption = {
  id: string
  name: string
  icon?: string | null
}

export const productForEditWizardSelect = {
  id: true,
  slug: true,
  userId: true,
  name: true,
  tagline: true,
  description: true,
  websiteUrl: true,
  logo: true,
  categoryId: true,
  type: true,
  pricingModel: true,
  startingPriceCents: true,
  currencyCode: true,
  platforms: true,
  keywords: true,
  bannerImage: true,
  status: true,
  metadata: {
    select: {
      githubUrl: true,
      twitterUrl: true,
      demoUrl: true,
      contactEmail: true,
      utmCampaign: true,
    },
  },
  alternatives: { select: { id: true } },
  ProductMedia: { select: { id: true, imageUrl: true } },
  verification: { select: { isVerified: true } },
  user: { select: { clerkId: true } },
} satisfies Prisma.ProductSelect

export type ProductWizardAlternativeOption = {
  id: string
  slug?: string | null
  name: string
  websiteUrl?: string | null
}

export type ProductWizardAdminUserOption = {
  id: string
  email: string
  clerkId: string
}

export type ProductWizardAdminEditUserOption = {
  id: string
  email: string
  clerkId: string
}

export type ProductForEditWizard = Prisma.ProductGetPayload<{
  select: typeof productForEditWizardSelect
}>
