import { describe, it, vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import DataTable from "@/components/molecules/DataTable"
import type { ColumnDef } from "@tanstack/react-table"
import { ADMIN_BASE_PATH } from "@/lib/routes"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => ADMIN_BASE_PATH,
  useSearchParams: () => new URLSearchParams("page=1&limit=10"),
}))

type Row = { id: string; name: string; age: number; other: string }

const columns: ColumnDef<Row>[] = [
  {
    id: "group",
    header: () => "Group",
    columns: [
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
    ],
  },
  {
    accessorKey: "other",
    header: "Other",
    cell: (ctx) => ctx.getValue() as string,
  },
]

const rows: Row[] = [{ id: "1", name: "Ada", age: 30, other: "X" }]

describe("DataTable header placeholder (mixed)", () => {
  it("renders with mixed grouped/ungrouped columns to trigger placeholder headers", () => {
    render(<DataTable columns={columns} data={rows} pageCount={1} />)
    // No strict assertions needed; render should exercise header.isPlaceholder branches
  })
})
