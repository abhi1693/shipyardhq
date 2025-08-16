import { render, screen, fireEvent, within } from "@testing-library/react";
import { ObjectHeading } from "@/components/layout/object-view/heading";
import { ClientObjectHeading } from "@/components/layout/object-view/client-object-heading";
import { vi } from "vitest";

let pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (...args: any[]) => pushMock(...args),
  }),
}));

describe("ObjectHeading", () => {
  it("renders title, id and slug and shows edit/delete buttons when provided", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ObjectHeading
        id="obj_123"
        title="Sample Object"
        createdAt={new Date("2024-01-01T00:00:00")}
        updatedAt={new Date("2024-01-02T12:34:00")}
        slug="sample-object"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByRole("heading", { name: /Sample Object/i })).toBeInTheDocument();
    expect(screen.getByText(/obj_123/i)).toBeInTheDocument();
    expect(screen.getByText(/\(sample-object\)/i)).toBeInTheDocument();
    // Buttons render
    expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Delete/i })[0]).toBeInTheDocument();
  });
});

describe("ClientObjectHeading", () => {
  it("navigates on edit and delete confirm when enabled", () => {
    pushMock = vi.fn();

    render(
      <ClientObjectHeading
        id="obj_9"
        title="Obj Nine"
        createdAt={new Date()}
        updatedAt={new Date()}
        basePath="things"
        editable
        deletable
      />
    );

    // Clicking Edit pushes to edit route
    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    expect(pushMock).toHaveBeenCalledWith("/things/obj_9/edit");

    // Delete flow: open modal then confirm
    const trigger = screen.getAllByRole("button", { name: /Delete/i })[0];
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: /Delete/i });
    fireEvent.click(confirm);
    expect(pushMock).toHaveBeenCalledWith("/things/obj_9/delete");
  });
});
