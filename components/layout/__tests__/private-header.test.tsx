import { render, screen } from "@testing-library/react";
import PrivateHeader from "@/components/layout/headers/private-header";

vi.mock("@/components/atoms/sidebar", () => ({
  SidebarTrigger: (props: any) => (
    <button aria-label="Toggle Sidebar" {...props} />
  ),
}));

vi.mock("@/components/atoms/separator", () => ({
  Separator: () => <div role="separator" />,
}));

vi.mock("@/components/molecules/BreadCrumbs", () => ({
  Breadcrumbs: () => <nav aria-label="breadcrumbs">Crumbs</nav>,
}));

vi.mock("@/components/layout/user-nav", () => ({
  UserNav: () => <div>UserNav</div>,
}));

describe("PrivateHeader", () => {
  it("renders sidebar trigger, breadcrumbs and user nav", () => {
    render(<PrivateHeader />);
    expect(screen.getByRole("button", { name: /toggle sidebar/i })).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByLabelText(/breadcrumbs/i)).toBeInTheDocument();
    expect(screen.getByText("UserNav")).toBeInTheDocument();
  });
});

