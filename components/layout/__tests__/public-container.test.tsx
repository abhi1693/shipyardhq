import React from "react";
import { render } from "@testing-library/react";
import PublicContainer from "@/components/layout/PublicContainer";

describe("PublicContainer", () => {
  it("renders as div with min-h-screen by default and 7xl max", () => {
    const { container } = render(
      <PublicContainer>
        <span>child</span>
      </PublicContainer>
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer.tagName.toLowerCase()).toBe("div");
    expect(outer.className).toMatch(/min-h-screen/);
    // inner max class present
    expect(container.querySelector(".max-w-7xl")).toBeTruthy();
  });

  it("renders as section without min-h-screen and marketing max", () => {
    const { container } = render(
      <PublicContainer as="section" fillScreen={false} max="marketing">
        <span>child</span>
      </PublicContainer>
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer.tagName.toLowerCase()).toBe("section");
    expect(outer.className).not.toMatch(/min-h-screen/);
    // marketing class applied on inner wrapper
    const inner = container.querySelector("div");
    expect(inner?.className).toMatch(/max-w-\[84rem\]/);
  });
});

