import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  protect: vi.fn(),
  activeUser: vi.fn(),
  findUnique: vi.fn(),
  defaultPlan: vi.fn(),
}))

vi.mock("@clerk/nextjs/server", () => ({ auth: { protect: mocks.protect } }))
vi.mock("@/lib/prisma", () => ({
  default: { product: { findUnique: mocks.findUnique } },
}))
vi.mock("@/lib/server/userStatus", () => ({
  getActiveUserByClerkId: mocks.activeUser,
  INACTIVE_ACCOUNT_MESSAGE: "Inactive account",
}))
vi.mock("@/lib/server/planDefaults", () => ({
  getDefaultPlanWithFeatures: mocks.defaultPlan,
}))
vi.mock("@/lib/server/events", () => ({ dispatchEventAsync: vi.fn() }))
vi.mock("@/lib/server/badges", () => ({}))
vi.mock("@/lib/server/plans", () => ({}))
vi.mock("@/lib/blob", () => ({
  deleteBlob: vi.fn(),
  deleteBlobPrefix: vi.fn(),
  isManagedBlobUrl: vi.fn(),
}))
vi.mock("@/lib/cache/revalidate", () => ({}))
vi.mock("@/lib/server/homepage/feed", () => ({
  refreshHomepageFeedCache: vi.fn(),
}))
vi.mock("@/lib/server/search/suggestions-cache", () => ({
  invalidateSearchSuggestionsCache: vi.fn(),
}))
vi.mock("@/lib/server/analytics/productAnalytics", () => ({
  invalidateProductAnalyticsRecordCache: vi.fn(),
}))
vi.mock("@/lib/server/dns", () => ({ resolveTxtRecords: vi.fn() }))

import {
  getProductById,
  getProductForEditWizard,
} from "@/actions/products/actions"

const ownerProduct = { id: "owned-product", userId: "owner", planGrants: [] }
const otherProduct = {
  id: "other-product",
  userId: "someone-else",
  planGrants: [],
}

describe.each([getProductById, getProductForEditWizard])(
  "%s resource protection",
  (read) => {
    beforeEach(() => {
      vi.resetAllMocks()
      mocks.protect.mockResolvedValue({ userId: "clerk-owner" })
      mocks.activeUser.mockResolvedValue({ id: "owner" })
      mocks.defaultPlan.mockResolvedValue({ id: "free" })
      mocks.findUnique.mockImplementation(
        async ({ where }) =>
          [ownerProduct, otherProduct].find(
            (product) =>
              product.id === where.id &&
              (!where.userId || product.userId === where.userId),
          ) ?? null,
      )
    })

    it("rejects signed-out calls before reading user or product data", async () => {
      const unauthorized = new Error("NEXT_UNAUTHORIZED")
      mocks.protect.mockRejectedValue(unauthorized)
      await expect(read(ownerProduct.id)).rejects.toBe(unauthorized)
      expect(mocks.activeUser).not.toHaveBeenCalled()
      expect(mocks.findUnique).not.toHaveBeenCalled()
    })

    it("denies suspended or missing accounts without reading products", async () => {
      mocks.activeUser.mockResolvedValue(null)
      await expect(read(ownerProduct.id)).resolves.toBeNull()
      expect(mocks.findUnique).not.toHaveBeenCalled()
    })

    it("does not expose another owner's product when called directly", async () => {
      await expect(read(otherProduct.id)).resolves.toBeNull()
      expect(mocks.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: otherProduct.id, userId: "owner" },
        }),
      )
    })

    it("allows the owner to read their product", async () => {
      await expect(read(ownerProduct.id)).resolves.toMatchObject({
        id: ownerProduct.id,
      })
      expect(mocks.activeUser).toHaveBeenCalledWith("clerk-owner")
    })
  },
)
