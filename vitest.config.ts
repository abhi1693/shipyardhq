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
      // Widen to cover all atoms/molecules/organisms by default
      include: [
        "lib/**/*",
        "hooks/**/*",
        "components/atoms/**/*.tsx",
        "components/molecules/**/*.tsx",
        "components/organisms/**/*.tsx",
      ],
      exclude: [
        "node_modules/**",
        ".next/**",
        "prisma/**",
        "next.config.ts",
        "postcss.config.mjs",
        "tailwind.config.js",
        "eslint.config.mjs",
        "**/*.d.ts",
        // Exclude some complex client-heavy molecules for now; we will expand later
        "components/molecules/DataTable.tsx",
        "components/molecules/ProductMediaManager.tsx",
        "components/molecules/ProductGridClient.tsx",
        "components/molecules/ProductWizardStepRenderer.tsx",
        // Optionally exclude entire pages layer if present
        "components/pages/**",
      ],
    },
  },
})
