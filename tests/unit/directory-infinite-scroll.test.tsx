import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true
let roots: Root[] = []
function render(node: ReactNode) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)
  act(() => root.render(node))
  return {
    rerender: (next: ReactNode) => act(() => root.render(next)),
    queryByText: (text: string) =>
      container.textContent?.includes(text) ? container : null,
  }
}
function cleanup() {
  act(() => roots.forEach((root) => root.unmount()))
  roots = []
  document.body.innerHTML = ""
}
import { afterEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ load: vi.fn(), category: vi.fn() }))
vi.mock("@/actions/public/products/feedPage", () => ({
  getProductFeedPage: mocks.load,
}))
vi.mock("@/actions/public/categories/server-actions", () => ({
  getCategoryProductsPage: mocks.category,
}))
vi.mock("@/components/templates/public/browse/BrowseProductRows", () => ({
  BrowseProductRows: ({ products }: { products: { id: string }[] }) => (
    <div>
      {products.map((p) => (
        <span key={p.id}>{p.id}</span>
      ))}
    </div>
  ),
}))
vi.mock("@/components/templates/public/common/TaxonomyProductRows", () => ({
  resolveTaxonomyReferenceDateIso: () => null,
  buildTaxonomyProductSections: () => [],
  TaxonomyProductSections: () => null,
}))
import { BrowseProductRowsClient } from "@/components/templates/public/browse/BrowseProductRowsClient"
import { CategoryFeedClient } from "@/components/templates/public/categories/detail/CategoryFeedClient"
let callbacks: (() => void)[] = []
function observers() {
  callbacks = []
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: unknown[]) => void) {
        callbacks.push(() => callback([{ isIntersecting: true }]))
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
}
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
describe("directory scrolling from a persistent page", () => {
  it("requests exactly the next page once when observers fire twice before a response", async () => {
    observers()
    let finish!: (value: unknown) => void
    mocks.load.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    render(
      <BrowseProductRowsClient
        initialProducts={[]}
        initialPage={3}
        initialHasMore
        pageSize={12}
        searchParams={{}}
      />,
    )
    await act(async () => {
      callbacks.at(-1)!()
      callbacks.at(-1)!()
    })
    expect(mocks.load).toHaveBeenCalledTimes(1)
    expect(mocks.load).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, pageSize: 12 }),
    )
    await act(async () => {
      finish({ items: [], hasMore: false })
    })
  })
  it("applies the same lock to category scrolling", async () => {
    observers()
    let finish!: (value: unknown) => void
    mocks.category.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    render(
      <CategoryFeedClient
        slug="ai"
        initialProducts={[]}
        initialPage={3}
        initialHasMore
        pageSize={12}
      />,
    )
    await act(async () => {
      callbacks.at(-1)!()
      callbacks.at(-1)!()
    })
    expect(mocks.category).toHaveBeenCalledTimes(1)
    expect(mocks.category).toHaveBeenCalledWith({
      slug: "ai",
      page: 3,
      pageSize: 12,
    })
    await act(async () => {
      finish({ products: [], hasMore: false, nextPage: null })
    })
  })
  it("discards an old browse response after navigation to a different page", async () => {
    observers()
    let finish!: (value: unknown) => void
    mocks.load.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const view = render(
      <BrowseProductRowsClient
        initialProducts={[]}
        initialPage={2}
        initialHasMore
        pageSize={12}
        searchParams={{}}
      />,
    )
    await act(async () => {
      callbacks.at(-1)!()
    })
    view.rerender(
      <BrowseProductRowsClient
        initialProducts={[]}
        initialPage={4}
        initialHasMore={false}
        pageSize={12}
        searchParams={{}}
      />,
    )
    await act(async () => {
      finish({ items: [{ id: "stale-result" }], hasMore: true })
    })
    expect(view.queryByText("stale-result")).toBeNull()
  })
})
