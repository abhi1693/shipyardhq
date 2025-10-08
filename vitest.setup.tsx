import "@testing-library/jest-dom/vitest"

// Minimal mocks for Next.js modules often imported by components
import { vi, beforeEach } from "vitest"

process.env.DODO_ENV = process.env.DODO_ENV || "test_mode"
process.env.DODO_API_KEY = process.env.DODO_API_KEY || "test_key"
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "prisma+postgres://user:password@localhost:5432/shipyard_test"

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof global.ResizeObserver === "undefined") {
  ;(global as any).ResizeObserver = ResizeObserverMock
}

type IntersectionObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver,
) => void

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = []
  public callback: IntersectionObserverCallback
  public elements: Element[] = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    IntersectionObserverMock.instances.push(this)
  }
  observe(element: Element) {
    this.elements.push(element)
  }
  unobserve(element: Element) {
    this.elements = this.elements.filter((item) => item !== element)
  }
  disconnect() {}
  takeRecords() {
    return []
  }
  trigger(entries: Partial<IntersectionObserverEntry>[] = []) {
    this.callback(
      entries.map(
        (entry) =>
          ({
            isIntersecting: true,
            target: this.elements[0],
            intersectionRatio: 1,
            ...entry,
          }) as IntersectionObserverEntry,
      ),
      this as unknown as IntersectionObserver,
    )
  }
}

if (typeof (global as any).IntersectionObserver === "undefined") {
  ;(global as any).IntersectionObserver = IntersectionObserverMock
}

;(global as any).__INTERSECTION_OBSERVER_INSTANCES__ =
  IntersectionObserverMock.instances

beforeEach(() => {
  IntersectionObserverMock.instances.length = 0
})

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
    const { src, alt, priority: _p, fill: _f, unoptimized: _u, ...rest } = props
    // Mark intentionally unused extracted props as used
    void _p
    void _f
    void _u
    // Render a basic img for testing (strip boolean-only props to avoid warnings)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={typeof src === "string" ? src : ""} alt={alt} {...rest} />
  },
}))
