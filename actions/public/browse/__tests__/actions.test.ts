import { beforeEach, describe, expect, it, vi } from "vitest"

const productCountMock = vi.hoisted(() => vi.fn())
const productFindManyMock = vi.hoisted(() => vi.fn())

vi.mock("next/cache", () => ({
  unstable_cache: (fn: any) => fn,
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    product: {
      count: productCountMock,
      findMany: productFindManyMock,
    },
    category: {
      findUnique: vi.fn(),
    },
    useCase: {
      findUnique: vi.fn(),
    },
  },
}))

import { getBrowseProducts } from "@/actions/public/browse/actions"

describe("getBrowseProducts", () => {
  beforeEach(() => {
    productCountMock.mockReset()
    productFindManyMock.mockReset()
  })

  it("applies keyword filters when loading regular products", async () => {
    productCountMock.mockResolvedValueOnce(0) // totalPriority
    productCountMock.mockResolvedValueOnce(1) // totalRegular
    productFindManyMock.mockResolvedValueOnce([
      {
        id: "prod-1",
        slug: "product-one",
        name: "Product One",
        logo: "/logo.png",
        tagline: "Ship faster",
        analytics: { upvotes: 10 },
        category: { name: "Productivity" },
      },
    ])

    const result = await getBrowseProducts({ query: "Shit" })

    expect(result.products).toHaveLength(1)
    expect(productFindManyMock).toHaveBeenCalledTimes(1)

    const findArgs = productFindManyMock.mock.calls[0]?.[0] ?? {}
    const where = (findArgs as any).where ?? {}
    const searchFilter = Array.isArray(where.AND) ? where.AND[0] : undefined

    expect(searchFilter?.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: { contains: "Shit", mode: "insensitive" },
        }),
      ]),
    )

    const planFilter = Array.isArray(where.AND) ? where.AND[1] : undefined

    expect(planFilter?.OR).toEqual(
      expect.arrayContaining([
        { plan: null },
        expect.objectContaining({
          plan: expect.objectContaining({
            is: expect.objectContaining({
              assignments: expect.objectContaining({
                none: expect.objectContaining({
                  enabled: true,
                  feature: expect.objectContaining({
                    is: expect.objectContaining({ key: "priorityPlacement" }),
                  }),
                }),
              }),
            }),
          }),
        }),
      ]),
    )
  })
})
