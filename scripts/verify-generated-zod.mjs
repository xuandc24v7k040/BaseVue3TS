import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import process from "node:process";

const root = resolve(process.cwd(), "src/api/generated/zod");
const ulidRegexSource = "^[0-7][0-9A-HJKMNP-TV-Z]{25}$";
const forbiddenChecks = [
  {
    label: "stringFormat('ulid'",
    pattern: /stringFormat\s*\(\s*['"]ulid['"]/u,
  },
  {
    label: "ULID regex source",
    pattern: /\^\[0-7\]\[0-9A-HJKMNP-TV-Z\]\{25\}\$/u,
  },
  {
    label: "ULID helper constants",
    pattern:
      /\b(?:[A-Za-z0-9_]*(?:Id|BranchId|UserId|RoleId|PermissionId)RegExp)\b/u,
  },
  {
    label: "zod.ulid chained with redundant string constraints",
    pattern: /zod\.ulid\s*\(\s*\)(?:\s*\.\s*(?:describe|optional|nullable|nullish|default|meta)\s*\([^)]*\))*\s*\.\s*(?:min|max|regex)\s*\(/su,
  },
];

async function collectTypeScriptFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `Generated Zod output root does not exist: ${directory}\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectTypeScriptFiles(path)));
      continue;
    }

    if (entry.isFile() && path.endsWith(".ts")) {
      files.push(path);
    }
  }

  return files;
}

function countMatches(content, pattern) {
  const globalPattern = new RegExp(pattern.source, `${pattern.flags}g`);
  return [...content.matchAll(globalPattern)].length;
}

const rootStat = await stat(root).catch(() => null);
if (!rootStat?.isDirectory()) {
  throw new Error(`Generated Zod output root does not exist: ${root}`);
}

const files = await collectTypeScriptFiles(root);
if (files.length === 0) {
  throw new Error(`Generated Zod output root has no TypeScript files: ${root}`);
}

let ulidCount = 0;
const failures = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  const displayPath = relative(process.cwd(), file);
  ulidCount += countMatches(content, /zod\.ulid\s*\(/u);

  for (const check of forbiddenChecks) {
    const count = countMatches(content, check.pattern);

    if (count > 0) {
      failures.push(`${displayPath}: ${check.label} (${count})`);
    }
  }
}

if (ulidCount === 0) {
  failures.push("No zod.ulid() calls found in generated Zod output.");
}

if (failures.length > 0) {
  console.error("Generated Zod verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Generated Zod files: ${files.length}`);
console.log(`zod.ulid() occurrences: ${ulidCount}`);
console.log("Forbidden occurrences: 0");
