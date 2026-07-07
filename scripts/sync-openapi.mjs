import { createHash } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const DEFAULT_OPENAPI_URL = "http://localhost:8000/api/docs-json";
const defaultOpenApiUrl = process.env.OPENAPI_URL ?? DEFAULT_OPENAPI_URL;
const defaultDestination = resolve(process.cwd(), "openapi/bookora.openapi.json");

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

export function countOperations(paths) {
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

function cloneDocument(document) {
  return JSON.parse(JSON.stringify(document));
}

function normalizeServerPrefix(serverUrl) {
  if (
    typeof serverUrl !== "string" ||
    !serverUrl.startsWith("/") ||
    serverUrl.startsWith("//") ||
    serverUrl.includes("?") ||
    serverUrl.includes("#") ||
    /^[a-z][a-z\d+.-]*:\/\//i.test(serverUrl)
  ) {
    fail(`Cannot normalize prefixed OpenAPI paths because servers[0].url is not a valid relative path: ${serverUrl ?? "<missing>"}.`);
  }

  const normalized = serverUrl.replace(/\/+$/, "");

  if (!normalized || normalized === "/") {
    fail(`Cannot normalize prefixed OpenAPI paths because servers[0].url is not a usable API prefix: ${serverUrl}.`);
  }

  return normalized;
}

export function normalizeOpenApiPaths(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    fail("Fetched OpenAPI document is not a JSON object.");
  }

  const paths = document.paths;
  if (!paths || typeof paths !== "object" || Array.isArray(paths)) {
    return document;
  }

  const pathEntries = Object.entries(paths);
  if (pathEntries.length === 0) {
    return document;
  }

  const serverUrl = document.servers?.[0]?.url;
  const serverPrefix = normalizeServerPrefix(serverUrl);
  const prefixedStart = `${serverPrefix}/`;
  let prefixedCount = 0;
  let unprefixedCount = 0;
  const normalizedPaths = {};
  const beforeOperationCount = countOperations(paths);

  for (const [pathKey, pathItem] of pathEntries) {
    if (typeof pathKey !== "string" || !pathKey.startsWith("/")) {
      fail(`OpenAPI path key is not an absolute path: ${pathKey}.`);
    }

    const isPrefixed = pathKey.startsWith(prefixedStart);
    const normalizedPath = isPrefixed ? pathKey.slice(serverPrefix.length) : pathKey;

    if (isPrefixed) {
      prefixedCount += 1;
    } else {
      unprefixedCount += 1;
    }

    if (!normalizedPath || normalizedPath === "/") {
      fail(`Cannot strip server prefix from OpenAPI path because it would create an empty path: ${pathKey}.`);
    }

    if (normalizedPaths[normalizedPath]) {
      fail(`Cannot normalize OpenAPI paths because stripping ${serverPrefix} would create duplicate path: ${normalizedPath}.`);
    }

    normalizedPaths[normalizedPath] = pathItem;
  }

  if (prefixedCount === 0) {
    return document;
  }

  if (unprefixedCount > 0) {
    fail(`Cannot normalize OpenAPI paths because prefixed and unprefixed paths are mixed for server prefix ${serverPrefix}.`);
  }

  const afterOperationCount = countOperations(normalizedPaths);
  if (afterOperationCount !== beforeOperationCount) {
    fail(`Cannot normalize OpenAPI paths because operation count changed from ${beforeOperationCount} to ${afterOperationCount}.`);
  }

  return {
    ...cloneDocument(document),
    paths: normalizedPaths,
  };
}

export function validateOpenApi(document) {
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

export async function fetchOpenApi(openApiUrl = defaultOpenApiUrl, fetchImpl = fetch) {
  let response;

  try {
    response = await fetchImpl(openApiUrl, {
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

export async function writeArtifact(document, destination = defaultDestination) {
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

export async function syncOpenApi(options = {}) {
  const openApiUrl = options.openApiUrl ?? defaultOpenApiUrl;
  const destination = options.destination ?? defaultDestination;
  const document = await fetchOpenApi(openApiUrl, options.fetchImpl ?? fetch);
  const normalizedDocument = normalizeOpenApiPaths(document);
  const stats = validateOpenApi(normalizedDocument);
  const hash = await writeArtifact(normalizedDocument, destination);

  return {
    destination,
    hash,
    openApiUrl,
    stats,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await syncOpenApi();

  console.log(`OpenAPI source: ${result.openApiUrl}`);
  console.log(`OpenAPI destination: ${result.destination}`);
  console.log(`Paths: ${result.stats.pathCount}`);
  console.log(`Operations: ${result.stats.operationCount}`);
  console.log(`Schemas: ${result.stats.schemaCount}`);
  console.log(`SHA-256: ${result.hash}`);
}
