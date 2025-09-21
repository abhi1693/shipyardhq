import "@testing-library/jest-dom/vitest"

// Minimal mocks for Next.js modules often imported by components
import { vi } from "vitest"

process.env.DODO_ENV = process.env.DODO_ENV || "test_mode"
process.env.DODO_API_KEY = process.env.DODO_API_KEY || "test_key"

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => {
    // Render as a regular anchor in tests
    return (
      <a href={typeof href === "string" ? href : "#"} {...props}>
        {children}
      </a>
    )
  },
}))

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const { src, alt, priority: _p, fill: _f, ...rest } = props
    // Mark intentionally unused extracted props as used
    void _p
    void _f
    // Render a basic img for testing (strip boolean-only props to avoid warnings)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={typeof src === "string" ? src : ""} alt={alt} {...rest} />
  },
}))
