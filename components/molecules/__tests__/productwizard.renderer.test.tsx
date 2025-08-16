import React from "react";
import { render, screen } from "@testing-library/react";
import { renderStep } from "@/components/molecules/ProductWizardStepRenderer";
import { vi } from "vitest";

// Mock next/dynamic to return a simple identifiable element containing props
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_loader: any) => {
    return (props: any) => (
      <div data-testid="dynamic" data-json={JSON.stringify(props)}>dyn</div>
    );
  },
}));

describe("ProductWizardStepRenderer.renderStep", () => {
  const categories = [
    { id: "c1", name: "AI" },
    { id: "c2", name: "DevTools" },
  ];
  const organizations = [
    { id: "o1", name: "Org 1" },
    { id: "o2", name: "Org 2" },
  ];

  function getJson() {
    const el = screen.getByTestId("dynamic");
    const json = JSON.parse(el.getAttribute("data-json") || "{}");
    return json as any;
  }

  it("renders step 1 with categories, platforms and productId", () => {
    render(
      renderStep(1, { categories, organizations, productId: "p1" }) as any,
    );
    const json = getJson();
    expect(json.categories).toHaveLength(2);
    expect(Array.isArray(json.platforms)).toBe(true);
    expect(json.productId).toBe("p1");
  });

  it("renders step 2 without props", () => {
    render(renderStep(2, { categories, organizations }) as any);
    const json = getJson();
    expect(Object.keys(json).length).toBe(0);
  });

  it("renders step 3 with productId and boolean persistOnVerify", () => {
    render(
      renderStep(3, {
        categories,
        organizations,
        productId: "p9",
        persistOnVerify: "truthy" as any,
      }) as any,
    );
    const json = getJson();
    expect(json.productId).toBe("p9");
    expect(json.persistOnVerify).toBe(true);
  });

  it("renders step 4 with organizations and productId", () => {
    render(
      renderStep(4, { categories, organizations, productId: "p2" }) as any,
    );
    const json = getJson();
    expect(json.organizations).toHaveLength(2);
    expect(json.productId).toBe("p2");
  });

  it("renders review for unknown step with categories and organizations", () => {
    render(renderStep(999, { categories, organizations }) as any);
    const json = getJson();
    expect(json.categories).toHaveLength(2);
    expect(json.organizations).toHaveLength(2);
  });
});
