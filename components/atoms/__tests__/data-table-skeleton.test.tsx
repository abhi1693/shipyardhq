import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

import { DataTableSkeleton } from "@/components/atoms/table/data-table-skeleton"

describe("DataTableSkeleton", () => {
  it("renders filters, header cells, rows, and pagination by default", () => {
    const { container } = render(
      <DataTableSkeleton columnCount={3} rowCount={2} filterCount={2} />,
    )

    // filter skeletons (inside the left filters container)
    const filtersContainer = container.querySelector(
      "div.flex.w-full.items-center.justify-between.gap-2",
    )
    const leftFilters = filtersContainer?.querySelector(
      "div.flex.flex-1.items-center.gap-2",
    ) as HTMLElement
    const filterSkeletons =
      leftFilters?.querySelectorAll('[data-slot="skeleton"]') ?? ([] as any)
    expect(filterSkeletons.length).toBe(2)

    // header cells count
    const headerCells = container.querySelectorAll("thead th")
    expect(headerCells.length).toBe(3)

    // body rows and cells
    const bodyRows = container.querySelectorAll("tbody tr")
    expect(bodyRows.length).toBe(2)
    const bodyCells = container.querySelectorAll("tbody td")
    expect(bodyCells.length).toBe(2 * 3)

    // view options skeleton should be present (exists as a skeleton in the top bar)
    const allTopSkeletons =
      filtersContainer?.querySelectorAll('[data-slot="skeleton"]') ??
      ([] as any)
    expect(allTopSkeletons.length).toBeGreaterThanOrEqual(3)

    // pagination skeleton group present
    expect(
      container.querySelector(
        ".flex.w-full.items-center.justify-between.gap-4",
      ),
    ).toBeTruthy()
  })

  it("respects cellWidths and shrinkZero for minWidth styling; hides view options/pagination", () => {
    const { container } = render(
      <DataTableSkeleton
        columnCount={2}
        rowCount={1}
        cellWidths={["10rem", "5rem"]}
        shrinkZero
        withViewOptions={false}
        withPagination={false}
      />,
    )

    const headerCells = container.querySelectorAll("thead th")
    expect(headerCells.length).toBe(2)
    // style attributes applied
    const first = headerCells[0] as HTMLElement
    const second = headerCells[1] as HTMLElement
    expect(first.style.width).toBe("10rem")
    expect(first.style.minWidth).toBe("10rem")
    expect(second.style.width).toBe("5rem")
    expect(second.style.minWidth).toBe("5rem")

    // pagination hidden (footer group absent)
    expect(
      container.querySelector(
        ".flex.w-full.items-center.justify-between.gap-4",
      ),
    ).toBeFalsy()
  })
})
