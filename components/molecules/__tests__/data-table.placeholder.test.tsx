import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import DataTable from "@/components/molecules/DataTable"
import type { ColumnDef } from "@tanstack/react-table"

// Mock next/navigation hooks
const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams("page=1&limit=10"),
}))

type Row = { id: string; name: string; age: number }

// Define a column group to create placeholder headers in the header groups
const columns: ColumnDef<Row>[] = [
  {
    id: "group",
    header: () => "Group",
    columns: [
      { accessorKey: "name", header: "Name", cell: (ctx) => ctx.getValue() as string },
      { accessorKey: "age", header: "Age", cell: (ctx) => String(ctx.getValue() as number) },
    ],
  },
]

const rows: Row[] = [
  { id: "1", name: "Ada", age: 30 },
]

describe("DataTable header placeholders", () => {
  it("renders grouped header and evaluates placeholder branch", () => {
    render(<DataTable columns={columns} data={rows} pageCount={1} />)
    // Group header renders
    expect(screen.getByText("Group")).toBeInTheDocument()
    // Child headers render
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Age")).toBeInTheDocument()
    // Row renders
    expect(screen.getByText("Ada")).toBeInTheDocument()
  })
})

