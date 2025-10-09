import React from "react"
import { render, screen, waitFor, act } from "@testing-library/react"
import { vi } from "vitest"

vi.mock("@/components/molecules/ProductCompactCard", () => ({
  ProductCompactCard: ({ product, category, upvotes }: any) => (
    <div
      data-testid="product-card"
      data-name={product?.name}
      data-category={category ?? ""}
      data-upvotes={upvotes ?? 0}
    />
  ),
}))

const loadMoreMock = vi.fn()
vi.mock("@/actions/public/browse/loadMore", () => ({
  loadMoreProducts: (...args: any[]) => loadMoreMock(...args),
}))

import ProductGridClient from "@/components/molecules/ProductGridClient"

const baseProduct = (over: Partial<any> = {}) => ({
  id: Math.random().toString(36).slice(2),
  slug: "slug",
  name: "Prod",
  logo: "/logo.png",
  tagline: "Tag",
  user: { firstName: "A", lastName: "B" },
  category: { name: "AI" },
  verification: { isVerified: true },
  analytics: { upvotes: 0 },
  ProductBadge: [],
  ...over,
})

const getObservers = () =>
  ((globalThis as any).__INTERSECTION_OBSERVER_INSTANCES__ ?? []) as Array<{
    trigger: (entries?: any[]) => void
  }>

const triggerIntersection = async () => {
  await waitFor(() => {
    if (!getObservers().length) {
      throw new Error("observer not ready")
    }
    return true
  })
  await act(async () => {
    getObservers()[0].trigger([{ isIntersecting: true }])
  })
}

describe("ProductGridClient", () => {
  beforeEach(() => {
    loadMoreMock.mockReset()
  })

  it("renders compact product cards with category and upvote data", async () => {
    const p1 = baseProduct({ name: "First", analytics: { upvotes: 42 } })
    loadMoreMock.mockResolvedValue({ products: [], hasMore: false })

    render(
      <ProductGridClient
        initialProducts={[p1]}
        initialHasMore={true}
        initialPage={1}
        searchParams={{}}
      />,
    )

    await waitFor(() => expect(loadMoreMock).toHaveBeenCalledTimes(1))

    const card = screen.getByTestId("product-card")
    expect(card.getAttribute("data-name")).toBe("First")
    expect(card.getAttribute("data-category")).toBe("AI")
    expect(card.getAttribute("data-upvotes")).toBe("42")
  })

  it("uses prefetched data on load more and removes sentinel when complete", async () => {
    const p1 = baseProduct({ name: "First" })
    const p2 = baseProduct({ name: "Second" })
    loadMoreMock.mockResolvedValueOnce({ products: [p2], hasMore: false })
    loadMoreMock.mockResolvedValue({ products: [], hasMore: false })

    render(
      <ProductGridClient
        initialProducts={[p1]}
        initialHasMore={true}
        initialPage={1}
        searchParams={{ sort: "new" }}
      />,
    )

    await waitFor(() => expect(loadMoreMock).toHaveBeenCalledTimes(1))
    await triggerIntersection()

    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-testid="product-card"]').length,
      ).toBe(2)
    })
    expect(screen.queryByTestId("browse-infinite-scroll-trigger")).toBeNull()
    expect(
      screen.getByText(/reached the end of the directory/i),
    ).toBeInTheDocument()
  })

  it("falls back to network when not prefetched and shows skeleton during pending", async () => {
    const p1 = baseProduct({ name: "First" })
    const p2 = baseProduct({ name: "Next" })

    let resolvePrefetch: (value: any) => void = () => {}
    const prefetchPromise = new Promise((res) => (resolvePrefetch = res))
    let resolveLoad: (value: any) => void = () => {}
    const loadPromise = new Promise((res) => (resolveLoad = res))

    loadMoreMock
      .mockImplementationOnce(() => prefetchPromise)
      .mockImplementationOnce(() => loadPromise)
      .mockResolvedValue({ products: [], hasMore: false })

    render(
      <ProductGridClient
        initialProducts={[p1]}
        initialHasMore={true}
        initialPage={1}
        searchParams={{}}
      />,
    )

    await triggerIntersection()

    expect(
      screen.getAllByTestId("product-card-skeleton").length,
    ).toBeGreaterThan(0)
    expect(
      document.querySelectorAll('[data-testid="product-card"]').length,
    ).toBe(1)

    await act(async () => {
      resolveLoad({ products: [p2], hasMore: true })
    })
    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-testid="product-card"]').length,
      ).toBe(2)
    })
    await waitFor(() =>
      expect(screen.queryAllByTestId("product-card-skeleton")).toHaveLength(0),
    )
    expect(
      screen.getByTestId("browse-infinite-scroll-trigger"),
    ).toBeInTheDocument()

    await act(async () => {
      resolvePrefetch({ products: [], hasMore: false })
    })
  })

  it("resets state when server-provided props change", async () => {
    const p1 = baseProduct({ name: "First" })
    const p2 = baseProduct({ name: "Second" })
    const p3 = baseProduct({ name: "Third" })
    loadMoreMock.mockResolvedValueOnce({ products: [p2], hasMore: false })

    const { rerender } = render(
      <ProductGridClient
        initialProducts={[p1]}
        initialHasMore={true}
        initialPage={1}
        searchParams={{}}
      />,
    )

    await waitFor(() => expect(loadMoreMock).toHaveBeenCalledTimes(1))
    await triggerIntersection()
    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-testid="product-card"]').length,
      ).toBe(2)
    })

    rerender(
      <ProductGridClient
        initialProducts={[p3]}
        initialHasMore={false}
        initialPage={2}
        searchParams={{ category: "tools" }}
      />,
    )

    expect(
      document.querySelectorAll('[data-testid="product-card"]').length,
    ).toBe(1)
    expect(
      document
        .querySelector('[data-testid="product-card"]')
        ?.getAttribute("data-name"),
    ).toBe("Third")
    expect(screen.queryByTestId("browse-infinite-scroll-trigger")).toBeNull()
    expect(
      screen.getByText(/reached the end of the directory/i),
    ).toBeInTheDocument()
  })
})
