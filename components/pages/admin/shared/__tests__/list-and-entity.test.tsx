import { render, screen } from "@testing-library/react";
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper";
import { EntityList } from "@/components/pages/admin/shared/EntityList";
import { vi } from "vitest";

vi.mock("@/components/molecules/DataTable", () => ({
  default: ({ data, columns, pageCount }: any) => (
    <div>
      DataTable rows:{data?.length} cols:{columns?.length} pages:{pageCount}
    </div>
  ),
}));

describe("ListPageWrapper", () => {
  it("renders title, description and optional add link", () => {
    render(
      <ListPageWrapper title="Users" addLink="/admin/users/add">
        <div>Child</div>
      </ListPageWrapper>
    );
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(
      screen.getByText(/Manage users in the admin panel/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Add New/i })).toHaveAttribute(
      "href",
      "/admin/users/add"
    );
    expect(screen.getByText("Child")).toBeInTheDocument();
  });
});

describe("EntityList", () => {
  it("passes data and columns to DataTable", () => {
    const data = [{ id: 1 }, { id: 2 }];
    const columns: any[] = [{ id: "id" }];
    render(<EntityList data={data} columns={columns} pageCount={5} />);
    expect(screen.getByText(/rows:2 cols:1 pages:5/)).toBeInTheDocument();
  });
});

