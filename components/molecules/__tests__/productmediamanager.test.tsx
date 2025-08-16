import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ProductMediaManager from "@/components/molecules/ProductMediaManager"
import { vi } from "vitest"

const refreshMock = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

describe("ProductMediaManager", () => {
  beforeEach(() => {
    refreshMock.mockReset()
    vi.restoreAllMocks()
  })

  function setup({ canEdit = true, max = 3, media = [] as any[] } = {}) {
    return render(
      <ProductMediaManager
        productId="prod_1"
        canEdit={canEdit}
        max={max}
        media={media}
      />,
    )
  }

  it("shows upload tile with remaining count when editable", () => {
    setup({ media: [{ id: "1", imageUrl: "/a.png" }], max: 3 })
    expect(screen.getByText(/Drag & drop images/i)).toBeInTheDocument()
    // shows 1 of 3 uploaded. remaining 2
    expect(screen.getByText(/1 of 3 uploaded/i)).toBeInTheDocument()
    expect(screen.getByText(/Add up to 2 more/i)).toBeInTheDocument()
    // existing image renders (Next/Image mock renders <img alt="" role=presentation>)
    expect(document.querySelector('img[src="/a.png"]')).toBeTruthy()
  })

  it("hides upload tile when cannot edit or no remaining", () => {
    // cannot edit
    setup({ canEdit: false, media: [] })
    expect(screen.queryByText(/Drag & drop images/i)).toBeNull()
    // no remaining
    render(
      <ProductMediaManager
        productId="p2"
        canEdit
        max={1}
        media={[{ id: "1", imageUrl: "/a.png" }]}
      />,
    )
    expect(screen.queryByText(/Drag & drop images/i)).toBeNull()
  })

  it("uploads files via input change and shows uploading overlay", async () => {
    let resolveUpload: any
    const pending = new Promise((res) => (resolveUpload = res))
    const fetchMock = vi
      .spyOn(global, "fetch" as any)
      .mockImplementation(() => pending as any)
    setup()
    const input = screen.getByLabelText(
      /Drag & drop images/i,
    ) as HTMLInputElement
    const file1 = new File(["data"], "a.png", { type: "image/png" })
    const file2 = new File(["data"], "b.png", { type: "image/png" })

    fireEvent.change(input, { target: { files: [file1, file2] } })

    // Overlay text appears
    await waitFor(() =>
      expect(screen.getAllByText(/Uploading…/i).length).toBeGreaterThan(0),
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    // finish request
    resolveUpload(new Response(null, { status: 200 }) as any)
    expect(fetchMock.mock.calls[0][0]).toMatch(
      /\/api\/products\/prod_1\/media$/,
    )
    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
    // overlay disappears
    await waitFor(() =>
      expect(screen.queryByText(/Uploading…/i)).not.toBeInTheDocument(),
    )
  })

  it("shows error when upload fails", async () => {
    vi.spyOn(global, "fetch" as any).mockResolvedValue(
      new Response("bad", { status: 500 }) as any,
    )
    setup()
    const input = screen.getByLabelText(
      /Drag & drop images/i,
    ) as HTMLInputElement
    const file = new File(["x"], "a.png", { type: "image/png" })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() =>
      expect(screen.getByText(/Upload failed|bad/i)).toBeInTheDocument(),
    )
  })

  it("handles drag-and-drop upload", async () => {
    vi.spyOn(global, "fetch" as any).mockResolvedValue(
      new Response(null, { status: 200 }) as any,
    )
    setup()
    const label = screen.getByText(/Drag & drop images/i).closest("label")!
    const file = new File(["x"], "a.png", { type: "image/png" })
    fireEvent.drop(label, { dataTransfer: { files: [file] } })
    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
  })

  it("removes image on delete and shows deleting overlay", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch" as any)
      .mockResolvedValue(new Response(null, { status: 204 }) as any)
    setup({ media: [{ id: "m1", imageUrl: "/a.png" }] })

    fireEvent.click(screen.getByRole("button", { name: /Remove image/i }))
    expect(screen.getByText(/Deleting…/i)).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).toMatch(
      /\/api\/products\/prod_1\/media\/m1$/,
    )
    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
  })

  it("shows error when delete fails", async () => {
    vi.spyOn(global, "fetch" as any).mockResolvedValue(
      new Response("nope", { status: 500 }) as any,
    )
    setup({ media: [{ id: "m2", imageUrl: "/a.png" }] })
    fireEvent.click(screen.getByRole("button", { name: /Remove image/i }))
    await waitFor(() =>
      expect(screen.getByText(/Failed to remove|nope/i)).toBeInTheDocument(),
    )
  })
})
