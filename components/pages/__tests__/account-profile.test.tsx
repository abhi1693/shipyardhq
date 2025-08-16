import { render, screen } from "@testing-library/react";
import AdminAccountProfile from "@/components/pages/AdminAccountProfile";
import MemberAccountProfile from "@/components/pages/MemberAccountProfile";
import { vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  UserProfile: (props: any) => <div>ProfilePath:{props.path}</div>,
}));

describe("Account Profile pages", () => {
  it("renders admin profile", () => {
    render(<AdminAccountProfile />);
    expect(screen.getByText(/ProfilePath:\/admin\/account\/profile/)).toBeInTheDocument();
  });

  it("renders member profile", () => {
    render(<MemberAccountProfile />);
    expect(screen.getByText(/ProfilePath:\/member\/account\/profile/)).toBeInTheDocument();
  });
});

