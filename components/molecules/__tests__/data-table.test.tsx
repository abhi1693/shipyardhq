import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DataTable from "@/components/molecules/DataTable"
import type { ColumnDef } from "@tanstack/react-table"

// Mock next/navigation
const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(searchStr),
}))

let searchStr = ""

type Row = { id: string; name: string; age: number }
const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: (ctx) => ctx.getValue() as string,
  },
  {
    accessorKey: "age",
    header: "Age",
    cell: (ctx) => String(ctx.getValue() as number),
  },
]

const rows: Row[] = [
  { id: "1", name: "Ada", age: 30 },
  { id: "2", name: "Bob", age: 40 },
  { id: "3", name: "Cyd", age: 50 },
]

beforeEach(() => {
  push.mockReset()
})

describe("DataTable", () => {
  it("renders rows, headers, and shows page x of y", () => {
    searchStr = "page=1&limit=10"
    render(<DataTable columns={columns} data={rows} pageCount={5} />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Age")).toBeInTheDocument()
    expect(screen.getByText("Ada")).toBeInTheDocument()
    expect(screen.getByText("30")).toBeInTheDocument()
    expect(screen.getByText(/Page 1 of 5/)).toBeInTheDocument()
  })

  it("shows No results when empty", () => {
    searchStr = "page=1&limit=10"
    render(<DataTable columns={columns} data={[]} pageCount={1} />)
    expect(screen.getByText("No results.")).toBeInTheDocument()
  })

  it("pushes updated page on pagination", async () => {
    const user = userEvent.setup()
    searchStr = "page=2&limit=20"
    render(<DataTable columns={columns} data={rows} pageCount={5} />)

    // Next page -> page=3
    await user.click(screen.getByRole("button", { name: "Next page" }))
    const url1 = (push as any).mock.calls.slice(-1)[0][0] as string
    const u1 = new URL("http://x" + (url1.startsWith("/") ? url1 : "/" + url1))
    expect(u1.pathname).toBe("/admin")
    expect(u1.searchParams.get("page")).toBe("3")
    expect(u1.searchParams.get("limit")).toBe("20")

    // No select interaction due to Radix JSDOM pointer constraints
  })

  it("previous/next buttons enable/disable correctly", async () => {
    const user = userEvent.setup()
    // Start on last page to verify previous enabled and next disabled
    searchStr = "page=5&limit=10"
    render(<DataTable columns={columns} data={rows} pageCount={5} />)
    const prev = screen.getByRole("button", { name: "Previous page" })
    const next = screen.getByRole("button", { name: "Next page" })
    expect(prev).not.toBeDisabled()
    expect(next).toBeDisabled()

    // Click Previous -> page=4
    await user.click(prev)
    const url = (push as any).mock.calls.slice(-1)[0][0] as string
    const u = new URL("http://x" + (url.startsWith("/") ? url : "/" + url))
    expect(u.searchParams.get("page")).toBe("4")
  })
})
