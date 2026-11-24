import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { extractComicDetails } from "@/utils/htmlParser";

const here = dirname(fileURLToPath(import.meta.url));

const fixtures: Array<{ file: string; expect: string }> = [
  {
    file: "../../docs/raw-pages/2026-11-23-locg-4051677-marvel-rivals-infinity-comic-68.html",
    expect: "Digital Comic",
  },
  {
    file: "../../docs/raw-pages/2026-11-23-locg-8799545-dnx-5.html",
    expect: "Print Comic",
  },
];

let failed = false;
for (const { file, expect } of fixtures) {
  const html = readFileSync(resolve(here, file), "utf8");
  const details = extractComicDetails(html);
  const ok = details.format === expect;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${file.split("/").pop()} -> format=${JSON.stringify(details.format)} (expected "${expect}")`,
  );
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
