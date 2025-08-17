import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  // Ignore generated vendor code (e.g., Prisma client output)
  { ignores: ["lib/vendor/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow pragmatic use of `any` in complex app code
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]

export default eslintConfig
