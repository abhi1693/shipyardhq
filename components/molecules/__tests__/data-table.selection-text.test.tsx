import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import DataTable from "@/components/molecules/DataTable"
import type { ColumnDef } from "@tanstack/react-table"
import { ADMIN_BASE_PATH } from "@/lib/routes"

const push = vi.fn()
let searchStr = ""
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => ADMIN_BASE_PATH,
  useSearchParams: () => new URLSearchParams(searchStr),
}))

type Row = { id: string; name: string }
const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: (ctx) => ctx.getValue() as string,
  },
]

describe("DataTable selection text", () => {
  it("renders row summary controls without selection copy for non-empty data", () => {
    searchStr = "page=1&limit=10"
    const data: Row[] = [
      { id: "1", name: "One" },
      { id: "2", name: "Two" },
      { id: "3", name: "Three" },
    ]
    render(<DataTable columns={columns} data={data} pageCount={1} />)
    expect(screen.getByText("Rows")).toBeInTheDocument()
    expect(screen.getByText("One")).toBeInTheDocument()
    expect(screen.queryByText(/rows selected/i)).toBeNull()
  })

  it("shows 0 of 0 rows selected for empty data", () => {
    searchStr = "page=1&limit=10"
    render(<DataTable columns={columns} data={[]} pageCount={1} />)
    expect(screen.getByText("No results.")).toBeInTheDocument()
    expect(screen.getByText("Rows")).toBeInTheDocument()
  })
})
