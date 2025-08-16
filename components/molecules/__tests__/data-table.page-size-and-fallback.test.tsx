import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import DataTable from "@/components/molecules/DataTable"
import type { ColumnDef } from "@tanstack/react-table"

// Router/Search mocks
const push = vi.fn()
let searchStr = ""
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(searchStr),
}))

// Mock atoms/select to simulate value change to 50 when trigger clicked
vi.mock("@/components/atoms/select", () => ({
  Select: ({ onValueChange, children }: any) => (
    <div>
      <button aria-label="rows-per-page" onClick={() => onValueChange("50")} />
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

type Row = { id: string; name: string }
const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: (ctx) => ctx.getValue() as string,
  },
]
const data: Row[] = [{ id: "1", name: "One" }]

beforeEach(() => push.mockReset())

describe("DataTable page size and fallback", () => {
  it("updates limit when selecting a new page size", async () => {
    searchStr = "page=2&limit=10"
    render(<DataTable columns={columns} data={data} pageCount={10} />)
    await screen.getByLabelText("rows-per-page").click()
    const url = (push as any).mock.calls.pop()[0] as string
    expect(url).toContain("limit=50")
    // tanstack resets pageIndex to 0 when pageSize changes
    expect(url).toContain("page=1")
  })

  it("falls back to page=1 and limit=10 on invalid query params", () => {
    searchStr = "page=abc&limit=foo"
    render(<DataTable columns={columns} data={data} pageCount={3} />)
    const url = (push as any).mock.calls.pop()[0] as string
    expect(url).toContain("page=1")
    expect(url).toContain("limit=10")
  })
})
