import { act, render, screen } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isSignedIn: false }),
}))

vi.mock("@/components/molecules/UpvoteSquareButton", () => ({
  __esModule: true,
  default: ({ children }: any) => (
    <button data-testid="mock-upvote" type="button">
      {children ?? "Upvote"}
    </button>
  ),
}))

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"

vi.mock("@/actions/public/homepage/feed", () => ({
  loadHomepageFeed: vi.fn(),
}))

import { loadHomepageFeed } from "@/actions/public/homepage/feed"
import HomepageFeedClient from "@/components/templates/public/homepage/homepage-feed-client"

const mockedLoadMore = vi.mocked(loadHomepageFeed)

function makeItem(id: string, overrides: Partial<HomepageFeedItem> = {}) {
  return {
    id,
    slug: `product-${id}`,
    name: `Product ${id}`,
    logo: "/logo.png",
    tagline: `Tagline for ${id}`,
    createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
    updatedAt: new Date("2024-01-05T00:00:00Z").toISOString(),
    badges: [],
    category: "Automation",
    categorySlug: "automation",
    voteCount: 10,
    isSponsored: false,
    isVoted: false,
    ...overrides,
  } satisfies HomepageFeedItem
}

const originalObserver = global.IntersectionObserver
const originalMatchMedia = window.matchMedia

beforeEach(() => {
  mockedLoadMore.mockReset()
  if (originalObserver) {
    global.IntersectionObserver = originalObserver
  }
  window.matchMedia = originalMatchMedia
})

afterEach(() => {
  mockedLoadMore.mockReset()
  if (originalObserver) {
    global.IntersectionObserver = originalObserver
  }
  window.matchMedia = originalMatchMedia
})

describe("HomepageFeedClient", () => {
  it("loads additional items when sentinel enters view", async () => {
    mockedLoadMore.mockResolvedValue({
      items: [makeItem("2")],
      page: 2,
      pageSize: 10,
      hasMore: false,
      nextPage: null,
    })

    render(
      <HomepageFeedClient
        initialItems={[makeItem("1")]}
        initialPage={1}
        initialNextPage={2}
        initialHasMore
      />,
    )

    const observers = (global as any).__INTERSECTION_OBSERVER_INSTANCES__ as {
      trigger: (entries?: Partial<IntersectionObserverEntry>[]) => void
    }[]
    expect(observers.length).toBeGreaterThan(0)

    await act(async () => {
      observers[0]?.trigger([{ isIntersecting: true }])
    })

    expect(mockedLoadMore).toHaveBeenCalledWith({ page: 2 })
    expect(await screen.findByText("Product 2")).toBeInTheDocument()
  })

  it("omits manual load button for static layouts when observers are unavailable", async () => {
    ;(global as any).IntersectionObserver = undefined
    window.matchMedia = () =>
      ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as any

    render(
      <HomepageFeedClient
        initialItems={[makeItem("1")]}
        initialPage={1}
        initialNextPage={2}
        initialHasMore
      />,
    )

    expect(
      screen.queryByRole("button", { name: /load more launches/i }),
    ).not.toBeInTheDocument()
    expect(mockedLoadMore).not.toHaveBeenCalled()
  })
})
