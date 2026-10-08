import { Suspense, type ReactElement } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  navigation: vi.fn(),
  getPartnerSpotlightProduct: vi.fn(),
}))

vi.mock("next/cache", () => ({ navigation: mocks.navigation }))
vi.mock("@/actions/public/products/featured", () => ({
  getPartnerSpotlightProduct: mocks.getPartnerSpotlightProduct,
}))
vi.mock("@/components/layout/headers/public-header", () => ({
  default: () => null,
}))
vi.mock("@/components/layout/footers/public-footer", () => ({
  default: () => null,
}))
vi.mock("@/components/templates/public/common/PartnerSpotlight", () => ({
  PartnerSpotlight: () => null,
}))
vi.mock("@/lib/metadata", () => ({ buildSectionMetadata: () => ({}) }))

import PublicLayout from "@/app/(public)/layout"

function renderSpotlight() {
  const layout = PublicLayout({ children: <p>Page content</p> })
  const boundary = layout.props.children.find(
    (child: ReactElement) => child.type === Suspense,
  )
  expect(boundary.props.fallback).toBeNull()
  return boundary.props.children.type() as Promise<
    ReactElement<{ product: unknown }>
  >
}

describe("public layout navigation", () => {
  beforeEach(() => {
    mocks.navigation.mockReset().mockResolvedValue(undefined)
    mocks.getPartnerSpotlightProduct.mockReset().mockResolvedValue(null)
  })

  it("renders the layout immediately and waits for navigation before querying placements", async () => {
    let navigate!: () => void
    mocks.navigation.mockReturnValue(
      new Promise<void>((resolve) => {
        navigate = resolve
      }),
    )
    const product = { id: "partner", slug: "partner", name: "Partner" }
    mocks.getPartnerSpotlightProduct.mockResolvedValue(product)

    const spotlight = renderSpotlight()
    expect(mocks.getPartnerSpotlightProduct).not.toHaveBeenCalled()
    navigate()

    expect((await spotlight).props.product).toEqual(product)
    expect(mocks.getPartnerSpotlightProduct).toHaveBeenCalledWith(
      "public-layout",
    )
  })

  it("keeps placement failures from failing the public page", async () => {
    mocks.getPartnerSpotlightProduct.mockRejectedValue(new Error("Unavailable"))
    expect((await renderSpotlight()).props.product).toBeNull()
  })
})
