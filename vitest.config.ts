import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.tsx"],
    globals: true,
  coverage: {
    provider: "v8",
    reportsDirectory: "./coverage",
    reporter: ["text", "html", "lcov"],
      include: ["lib/coverageTarget.ts", "components/atoms/chart.tsx"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "prisma/**",
        "next.config.ts",
        "postcss.config.mjs",
        "tailwind.config.js",
        "eslint.config.mjs",
        "**/*.d.ts",
      ],
      thresholds: {
        // Enforce minimum coverage while keeping requirements achievable
        lines: 100,
        statements: 100,
      },
    },
  },
})
