import { defineConfig } from "orval";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const openApiInput =
  process.env.OPENAPI_INPUT ?? "./openapi/bookora.openapi.json";
const isOpenApiUrl = /^https?:\/\//u.test(openApiInput);
const resolvedOpenApiInput = isOpenApiUrl
  ? openApiInput
  : resolve(process.cwd(), openApiInput);

if (!isOpenApiUrl && !existsSync(resolvedOpenApiInput)) {
  throw new Error(
    `OpenAPI input not found: ${resolvedOpenApiInput}. Provide OPENAPI_INPUT or copy the canonical artifact to ./openapi/bookora.openapi.json.`,
  );
}

export default defineConfig({
  bookora: {
    input: {
      target: resolvedOpenApiInput,
    },
    output: {
      mode: "tags-split",
      target: "src/api/generated/endpoints",
      schemas: "src/api/generated/models",
      client: "vue-query",
      httpClient: "axios",
      tsconfig: {
        compilerOptions: {
          target: "esnext",
        },
      },
      override: {
        mutator: {
          path: "src/api/mutator.ts",
          name: "customInstance",
        },
      },
    },
  },
  bookoraZod: {
    input: {
      target: resolvedOpenApiInput,
    },
    output: {
      mode: "tags-split",
      target: "src/api/generated/zod",
      client: "zod",
      clean: true,
      override: {
        zod: {
          strict: {
            body: true,
            query: true,
            param: true,
            header: true,
          },
          generate: {
            body: true,
            query: true,
            param: true,
            header: true,
            response: false,
          },
          coerce: {
            body: false,
            query: false,
            param: false,
            header: false,
          },
        },
      },
    },
  },
});
