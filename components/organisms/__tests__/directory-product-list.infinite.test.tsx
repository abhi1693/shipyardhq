import { render, screen, waitFor, act } from "@testing-library/react"

import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"

const sampleItem = (index: number) => ({
  id: `product-${index}`,
  slug: `product-${index}`,
  name: `Product ${index}`,
  logo: `/logo-${index}.png`,
  tagline: `Tagline ${index}`,
  analytics: { upvotes: index },
  category: { name: "Category" },
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

describe("DirectoryProductList", () => {
  it("loads additional product chunks when the sentinel intersects", async () => {
    const items = Array.from({ length: 6 }, (_, index) => sampleItem(index + 1))

    render(
      <DirectoryProductList
        items={items}
        columns="grid-cols-1"
        pageSize={2}
        showCategory
        showBadges={false}
        sentinelMargin="0px"
      />,
    )

    await waitFor(() =>
      expect(screen.getAllByTestId("product-compact-card").length).toBe(2),
    )

    await triggerIntersection()
    await waitFor(() =>
      expect(screen.getAllByTestId("product-compact-card").length).toBe(4),
    )

    await triggerIntersection()
    await waitFor(() =>
      expect(screen.getAllByTestId("product-compact-card").length).toBe(6),
    )
  })
})
