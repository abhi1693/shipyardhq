import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
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

  it("uses prefetched data on load more and hides button when no more", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: /Load More/i }))

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="product-card"]').length).toBe(2)
    })
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Load More/i })).toBeNull(),
    )
  })

  it("falls back to network when not prefetched and shows skeleton during pending", async () => {
    const p1 = baseProduct({ name: "First" })
    const p2 = baseProduct({ name: "Next" })

    let resolvePrefetch: any
    const prefetchPromise = new Promise((res) => (resolvePrefetch = res))
    let resolveLoad: any
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

    fireEvent.click(screen.getByRole("button", { name: /Load More/i }))

    expect(screen.getByText(/Loading.../i)).toBeInTheDocument()
    expect(screen.getAllByTestId("product-card-skeleton").length).toBeGreaterThan(0)

    resolveLoad({ products: [p2], hasMore: true })
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="product-card"]').length).toBe(2)
    })
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent(/Load More/i),
    )

    resolvePrefetch({ products: [], hasMore: false })
  })

  it("resets state when server-provided props change", async () => {
    const p1 = baseProduct({ name: "First" })
    const p2 = baseProduct({ name: "Second" })
    loadMoreMock.mockResolvedValue({ products: [], hasMore: false })

    const { rerender } = render(
      <ProductGridClient
        initialProducts={[p1]}
        initialHasMore={true}
        initialPage={1}
        searchParams={{}}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Load More/i }))
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="product-card"]').length).toBe(1)
    })

    rerender(
      <ProductGridClient
        initialProducts={[p2]}
        initialHasMore={false}
        initialPage={2}
        searchParams={{ category: "tools" }}
      />,
    )

    expect(document.querySelectorAll('[data-testid="product-card"]').length).toBe(1)
    expect(screen.queryByRole("button", { name: /Load More/i })).toBeNull()
  })
})
