import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs"

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users/list",
}))

describe("useBreadcrumbs", () => {
  it("builds breadcrumbs from pathname segments", () => {
    const { result } = renderHook(() => useBreadcrumbs())
    expect(result.current).toEqual([
      { title: "Admin", link: "/admin" },
      { title: "Users", link: "/admin/users" },
      { title: "List", link: "/admin/users/list" },
    ])
  })
})
