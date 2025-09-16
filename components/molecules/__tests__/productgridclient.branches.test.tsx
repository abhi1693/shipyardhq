import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ProductGridClient from "@/components/molecules/ProductGridClient"
import { vi } from "vitest"

// Mock ProductList to expose items and topRight rendering
vi.mock("@/components/molecules/ProductList", () => ({
  __esModule: true,
  default: ({ items, topRight }: any) => (
    <div data-testid="product-list" data-count={items.length}>
      {items.map((it: any, i: number) => (
        <div
          key={it.id}
          data-testid={`item-${i}`}
          data-badges={(it.badges || []).join(",")}
        >
          <span>{it.name}</span>
          {topRight ? (
            <div data-testid={`top-${i}`}>{topRight(it, i)}</div>
          ) : null}
        </div>
      ))}
    </div>
  ),
}))

// Mock server action
const loadMoreMock = vi.fn()
vi.mock("@/actions/public/browse/loadMore", () => ({
  loadMoreProducts: (...args: any[]) => loadMoreMock(...args),
}))

function futureDate(days = 1) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function pastDate(days = 1) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// Minimal product factory
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

  it("renders items with filtered badges and topRight (verified + category)", async () => {
    const p1 = baseProduct({
      name: "First",
      ProductBadge: [
        { badge: "Gold", expiresAt: futureDate(2) },
        { badge: "Old", expiresAt: pastDate(2) },
      ],
    })
    loadMoreMock.mockResolvedValue({ products: [], hasMore: false })

    render(
      <ProductGridClient
        initialProducts={[p1]}
        initialHasMore={true}
        initialPage={1}
        searchParams={{}}
      />,
    )

    // Prefetch happens once
    await waitFor(() => expect(loadMoreMock).toHaveBeenCalledTimes(1))

    // Only non-expired badge is present
    expect(screen.getByTestId("item-0").getAttribute("data-badges")).toBe(
      "Gold",
    )
    // topRight should contain Verified and category
    expect(screen.getByText(/Verified/i)).toBeInTheDocument()
    expect(screen.getByText(/AI/)).toBeInTheDocument()
  })

  it("uses prefetched data on load more and hides button when no more", async () => {
    const p1 = baseProduct({ name: "First" })
    const p2 = baseProduct({ name: "Second" })
    // First call: prefetch
    loadMoreMock.mockResolvedValueOnce({ products: [p2], hasMore: false })
    // Subsequent calls (next prefetch after page increment)
    loadMoreMock.mockResolvedValue({ products: [], hasMore: false })

    render(
      <ProductGridClient
        initialProducts={[p1]}
        initialHasMore={true}
        initialPage={1}
        searchParams={{ sort: "new" }}
      />,
    )

    // Wait for initial prefetch
    await waitFor(() => expect(loadMoreMock).toHaveBeenCalledTimes(1))

    // Click Load More -> should append p2 from prefetchedRef
    fireEvent.click(screen.getByRole("button", { name: /Load More/i }))

    await waitFor(() =>
      expect(
        screen.getByTestId("product-list").getAttribute("data-count"),
      ).toBe("2"),
    )
    // Since hasMore false in result, button disappears
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Load More/i })).toBeNull(),
    )
  })

  it("falls back to network when not prefetched and shows skeleton during pending", async () => {
    const p1 = baseProduct({ name: "First" })
    const p2 = baseProduct({ name: "Next" })

    // Deferred promises to control timing
    let resolvePrefetch: any
    const prefetchPromise = new Promise((res) => (resolvePrefetch = res))
    let resolveLoad: any
    const loadPromise = new Promise((res) => (resolveLoad = res))

    // 1st call (prefetch) pending; 2nd call (load more) pending too
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

    // Click load more immediately (prefetch not ready -> network path)
    fireEvent.click(screen.getByRole("button", { name: /Load More/i }))

    // During transition, skeletons and Loading...
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument()
    expect(
      document.querySelectorAll('[class*="grid-cols-"]').length,
    ).toBeGreaterThan(0)

    // Resolve loadMore call
    resolveLoad({ products: [p2], hasMore: true })
    await waitFor(() =>
      expect(
        screen.getByTestId("product-list").getAttribute("data-count"),
      ).toBe("2"),
    )
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent(/Load More/i),
    )

    // Clean up: resolve prefetch
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

    // Append an item via state change (simulate previous growth)
    fireEvent.click(screen.getByRole("button", { name: /Load More/i }))
    await waitFor(() =>
      expect(
        screen.getByTestId("product-list").getAttribute("data-count"),
      ).toBe("1"),
    )

    // Rerender with new server props -> resets to p2 only and no button when hasMore false
    rerender(
      <ProductGridClient
        initialProducts={[p2]}
        initialHasMore={false}
        initialPage={2}
        searchParams={{ category: "tools" }}
      />,
    )

    expect(screen.getByTestId("product-list").getAttribute("data-count")).toBe(
      "1",
    )
    expect(screen.queryByRole("button", { name: /Load More/i })).toBeNull()
  })
})
