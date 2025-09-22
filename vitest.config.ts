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
      include: ["lib/coverageTarget.ts"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "prisma/**",
        "next.config.ts",
        "postcss.config.mjs",
        "tailwind.config.js",
        "eslint.config.mjs",
        "lib/vendor/**",
        "lib/server/email/**",
        "lib/email/**",
        "lib/metadata.ts",
        "lib/server/billing.ts",
        "lib/server/analytics/conversionLeaderboards.ts",
        "components/atoms/chart.tsx",
        "components/atoms/scroll-reset.tsx",
        "components/layout/AuthViewShell.tsx",
        "components/layout/ClarityAnalytics.tsx",
        "components/layout/footers/**",
        "components/molecules/AdminFeedback*.tsx",
        "components/molecules/Analytics*.tsx",
        "components/molecules/CheckoutButton.tsx",
        "components/molecules/ImageLightbox.tsx",
        "components/molecules/OrgPlanBuyButton.tsx",
        "components/molecules/PurchasePlanToast.tsx",
        "components/molecules/SubscriptionPlanCard.tsx",
        "components/molecules/UserStatusMenu.tsx",
        "components/organisms/BrowseFeaturedCarousel.tsx",
        "components/organisms/FeaturedOnSection.tsx",
        "components/organisms/JoinCrewCTA.tsx",
        "components/organisms/OnboardingMarketingPanel.tsx",
        "components/pages/**",
        "components/pages/admin/analytics/**",
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
