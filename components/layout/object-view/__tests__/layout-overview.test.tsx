import { render, screen } from "@testing-library/react";
import { OverviewCard, OverviewRow } from "@/components/layout/object-view/overview";
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Overview primitives", () => {
  it("renders OverviewCard and OverviewRow", () => {
    render(
      <OverviewCard title="Overview">
        <OverviewRow label="Name" value={<span>A</span>} />
      </OverviewCard>
    );

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});

const heading = {
  id: "id1",
  title: "Title 1",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const baseProps = {
  heading,
  basePath: "things",
  overview: [
    { label: "Field1", value: "V1" },
    { label: "Field2", value: "V2" },
  ],
};

describe("ObjectPageLayout", () => {
  it("renders simple overview when no extras", () => {
    render(<ObjectPageLayout {...baseProps} />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Field1")).toBeInTheDocument();
    expect(screen.getByText("V2")).toBeInTheDocument();
  });

  it("renders overview with one sidebar extra", () => {
    render(
      <ObjectPageLayout
        {...baseProps}
        sidebar={<div>ExtraA</div>}
      />
    );
    expect(screen.getByText("ExtraA")).toBeInTheDocument();
  });

  it("renders two extras side by side", () => {
    render(
      <ObjectPageLayout
        {...baseProps}
        topRowExtras={[<div key="1">Extra1</div>, <div key="2">Extra2</div>]}
      />
    );
    expect(screen.getByText("Extra1")).toBeInTheDocument();
    expect(screen.getByText("Extra2")).toBeInTheDocument();
  });

  it("renders three extras in nested grid", () => {
    render(
      <ObjectPageLayout
        {...baseProps}
        topRowExtras={[
          <div key="1">Extra1</div>,
          <div key="2">Extra2</div>,
          <div key="3">Extra3</div>,
        ]}
      />
    );
    expect(screen.getByText("Extra3")).toBeInTheDocument();
  });

  it("renders >3 extras across rows and relationships", () => {
    render(
      <ObjectPageLayout
        {...baseProps}
        topRowExtras={[
          <div key="1">A</div>,
          <div key="2">B</div>,
          <div key="3">C</div>,
          <div key="4">D</div>,
        ]}
        relationships={<div>Rel</div>}
      />
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByText("Rel")).toBeInTheDocument();
  });
});

