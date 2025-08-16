import { describe, it, expect } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/atoms/table"

describe("Table atoms classes", () => {
  it("applies custom classes and renders container wrapper", () => {
    const { container } = render(
      <Table className="tbl-x">
        <TableCaption className="cap-x">Caption</TableCaption>
        <TableHeader>
          <TableRow className="row-x">
            <TableHead className="head-x">H</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="cell-x">C</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    const wrapper = container.querySelector(
      '[data-slot="table-container"]',
    ) as HTMLElement
    expect(wrapper).toBeTruthy()
    expect(container.querySelector('[data-slot="table"]')?.className).toContain(
      "tbl-x",
    )
    expect(
      container.querySelector('[data-slot="table-head"]')?.className,
    ).toContain("head-x")
    expect(
      container.querySelector('[data-slot="table-cell"]')?.className,
    ).toContain("cell-x")
    expect(
      container.querySelector('[data-slot="table-caption"]')?.className,
    ).toContain("cap-x")
  })
})
