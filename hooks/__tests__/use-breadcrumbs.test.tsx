import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs"
import { ADMIN_BASE_PATH, adminPath } from "@/lib/routes"

vi.mock("next/navigation", () => ({
  usePathname: () => adminPath("users", "list"),
}))

describe("useBreadcrumbs", () => {
  it("builds breadcrumbs from pathname segments", () => {
    const { result } = renderHook(() => useBreadcrumbs())
    expect(result.current).toEqual([
      { title: "Admin", link: ADMIN_BASE_PATH },
      { title: "Users", link: adminPath("users") },
      { title: "List", link: adminPath("users", "list") },
    ])
  })
})
