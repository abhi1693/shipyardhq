import { describe, it, beforeEach, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DataTable from "@/components/molecules/DataTable"
import type { ColumnDef } from "@tanstack/react-table"

const push = vi.fn()
let searchStr = ""
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/admin",
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
const data: Row[] = Array.from({ length: 3 }, (_, i) => ({
  id: String(i + 1),
  name: `R${i + 1}`,
}))

beforeEach(() => push.mockReset())

describe("DataTable prev/next clicks", () => {
  it("updates pagination when navigating backward and forward", async () => {
    const user = userEvent.setup()
    // Start on page 3 of 5
    searchStr = "page=3&limit=10"
    render(<DataTable columns={columns} data={data} pageCount={5} />)

    // Previous -> should push page=2
    await user.click(screen.getByRole("button", { name: "Previous page" }))
    let url = (push as any).mock.calls.slice(-1)[0][0] as string
    let u = new URL("http://x" + (url.startsWith("/") ? url : "/" + url))
    expect(u.searchParams.get("page")).toBe("2")

    // Next twice -> page should advance to 4
    await user.click(screen.getByRole("button", { name: "Next page" }))
    await user.click(screen.getByRole("button", { name: "Next page" }))
    url = (push as any).mock.calls.slice(-1)[0][0] as string
    u = new URL("http://x" + (url.startsWith("/") ? url : "/" + url))
    expect(u.searchParams.get("page")).toBe("4")
  })
})
