import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/molecules/PageHeader";

describe("PageHeader branches", () => {
  it("renders left aligned without underline, subtitle or meta", () => {
    render(<PageHeader title="Hello" />);
    const title = screen.getByRole("heading", { name: /Hello/ });
    expect(title).toBeInTheDocument();
    // No underline bar
    expect(document.querySelector('[class*="w-16 rounded-full"]')).toBeNull();
  });

  it("renders centered with underline, subtitle and meta", () => {
    render(
      <PageHeader
        title="Welcome"
        align="center"
        underline
        subtitle={<span>Sub</span>}
        meta={<span>Meta</span>}
      />
    );
    expect(screen.getByRole("heading", { name: /Welcome/ })).toBeInTheDocument();
    expect(screen.getByText("Sub")).toBeInTheDocument();
    expect(screen.getByText("Meta")).toBeInTheDocument();
    // Underline presence
    expect(document.querySelector('[class*="w-16 rounded-full"]')).toBeTruthy();
  });
});

