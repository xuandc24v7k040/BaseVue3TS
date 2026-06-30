import { createHash } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const DEFAULT_OPENAPI_URL = "http://localhost:8000/api/docs-json";
const openApiUrl = process.env.OPENAPI_URL ?? DEFAULT_OPENAPI_URL;
const destination = resolve(process.cwd(), "openapi/bookora.openapi.json");

const requiredPaths = [
  "/auth/login",
  "/auth/me",
  "/auth/csrf-token",
  "/users",
  "/branches",
  "/staff",
];

const requiredSecuritySchemes = [
  "accessToken",
  "refreshToken",
  "csrfCookie",
  "csrfHeader",
];

function fail(message) {
  throw new Error(message);
}

function countOperations(paths) {
  const methods = new Set([
    "get",
    "put",
    "post",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
  ]);

  return Object.values(paths ?? {}).reduce((total, pathItem) => {
    if (!pathItem || typeof pathItem !== "object") {
      return total;
    }

    return (
      total +
      Object.keys(pathItem).filter((key) => methods.has(key.toLowerCase()))
        .length
    );
  }, 0);
}

function validateOpenApi(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    fail("Fetched OpenAPI document is not a JSON object.");
  }

  if (document.openapi !== "3.0.0") {
    fail(`Unexpected OpenAPI version: ${document.openapi ?? "<missing>"}.`);
  }

  if (document.info?.title !== "Bookora API") {
    fail(`Unexpected API title: ${document.info?.title ?? "<missing>"}.`);
  }

  if (document.servers?.[0]?.url !== "/api/v1") {
    fail(`Unexpected server URL: ${document.servers?.[0]?.url ?? "<missing>"}.`);
  }

  const paths = document.paths;
  for (const path of requiredPaths) {
    if (!paths?.[path]) {
      fail(`Required OpenAPI path is missing: ${path}.`);
    }
  }

  const securitySchemes = document.components?.securitySchemes;
  for (const scheme of requiredSecuritySchemes) {
    if (!securitySchemes?.[scheme]) {
      fail(`Required security scheme is missing: ${scheme}.`);
    }
  }

  return {
    pathCount: Object.keys(paths ?? {}).length,
    operationCount: countOperations(paths),
    schemaCount: Object.keys(document.components?.schemas ?? {}).length,
  };
}

async function fetchOpenApi() {
  let response;

  try {
    response = await fetch(openApiUrl, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    fail(
      `Cannot fetch OpenAPI from ${openApiUrl}.\nStart the Bookora backend and try again.\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    fail(
      `Cannot fetch OpenAPI from ${openApiUrl}.\nReceived HTTP ${response.status} ${response.statusText}.\nStart the Bookora backend and try again.`,
    );
  }

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    fail(
      `Cannot parse OpenAPI JSON from ${openApiUrl}.\n${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function writeArtifact(document) {
  const content = `${JSON.stringify(document, null, 2)}\n`;
  const hash = createHash("sha256").update(content).digest("hex").toUpperCase();
  const directory = dirname(destination);
  const temporaryFile = resolve(
    directory,
    `.bookora.openapi.${process.pid}.${Date.now()}.tmp`,
  );

  await mkdir(directory, { recursive: true });

  try {
    await writeFile(temporaryFile, content, "utf8");
    await rename(temporaryFile, destination);
  } catch (error) {
    await rm(temporaryFile, { force: true });
    throw error;
  }

  return hash;
}

const document = await fetchOpenApi();
const stats = validateOpenApi(document);
const hash = await writeArtifact(document);

console.log(`OpenAPI source: ${openApiUrl}`);
console.log(`OpenAPI destination: ${destination}`);
console.log(`Paths: ${stats.pathCount}`);
console.log(`Operations: ${stats.operationCount}`);
console.log(`Schemas: ${stats.schemaCount}`);
console.log(`SHA-256: ${hash}`);
