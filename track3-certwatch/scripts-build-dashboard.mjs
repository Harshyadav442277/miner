// Regenerates src/dashboard.ts from public/index.html.
//
// Uses JSON.stringify rather than a template literal: the dashboard's own client
// script contains backticks and ${...} interpolations, and hand-escaping those into
// a TS template literal is a bug farm. A JSON string literal is valid JS and needs
// no manual escaping at all.
import { readFile, writeFile } from "node:fs/promises";

const html = await readFile("public/index.html", "utf8");
const header = [
  "/**",
  " * The dashboard, embedded as a string.",
  " *",
  " * Serverless bundlers ship compiled JS but not necessarily sibling asset",
  " * directories, and reading a file at request time is one more thing that can fail",
  " * in production but not locally. Inlining removes the failure mode entirely.",
  " *",
  " * GENERATED — edit public/index.html and run `npm run build:dashboard`.",
  " */",
  "",
].join("\n");

await writeFile("src/dashboard.ts", `${header}export const DASHBOARD_HTML = ${JSON.stringify(html)};\n`, "utf8");
console.log(`regenerated src/dashboard.ts (${html.length} bytes of HTML)`);
