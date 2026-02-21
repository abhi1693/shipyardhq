import type { OpenAPIObject } from "openapi3-ts/oas30"
import { defineConfig } from "orval"

const omitWebhookPaths = (schema: OpenAPIObject): OpenAPIObject => {
  if (!schema.paths) {
    return schema
  }
  const filteredPaths = Object.fromEntries(
    Object.entries(schema.paths).filter(
      ([path]) => !path.toLowerCase().includes("webhooks"),
    ),
  )
  const components = schema.components
  const filteredSchemas = components?.schemas
    ? Object.fromEntries(
        Object.entries(components.schemas).filter(
          ([name]) => !name.toLowerCase().includes("webhook"),
        ),
      )
    : components?.schemas
  return {
    ...schema,
    paths: filteredPaths,
    components: components
      ? {
          ...components,
          schemas: filteredSchemas,
        }
      : components,
  }
}

export default defineConfig({
  fastapi: {
    input: {
      target: "../backend/openapi.json",
      filters: {
        mode: "exclude",
        tags: [/webhooks?/i],
        schemas: [/webhook/i],
      },
      override: {
        transformer: omitWebhookPaths,
      },
    },
    output: {
      client: "react-query",
      httpClient: "fetch",
      mode: "tags",
      target: "lib/generated/fastapi",
      schemas: "lib/generated/fastapi/schemas",
      clean: true,
      indexFiles: true,
      tsconfig: "tsconfig.orval.json",
      override: {
        mutator: {
          path: "lib/fastapi-fetcher.ts",
          name: "fastapiFetch",
        },
        fetch: {
          includeHttpResponseReturnType: true,
        },
      },
    },
  },
})
