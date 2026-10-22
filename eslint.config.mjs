import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const nextVitalsWithoutLegacyReactRules = nextVitals.map((config) => ({
  ...config,
  rules: Object.fromEntries(
    Object.entries(config.rules ?? {}).filter(
      ([ruleName]) => !ruleName.startsWith("react/"),
    ),
  ),
}))

const eslintConfig = defineConfig([
  ...nextVitalsWithoutLegacyReactRules,
  ...nextTs,
  // Dependency regression tests intentionally exercise CommonJS resolution.
  {
    files: ["scripts/**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],
    rules: {
      // Keep the stricter hooks feedback visible for existing state resets.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "packages/braces/**",
    "next-env.d.ts",
    "lib/vendor/**",
  ]),
])

export default eslintConfig
