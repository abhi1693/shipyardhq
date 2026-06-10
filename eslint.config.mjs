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
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
    "lib/vendor/**",
  ]),
])

export default eslintConfig
