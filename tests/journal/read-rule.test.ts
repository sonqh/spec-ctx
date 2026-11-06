// Covers: REQ-JRN-005
import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "../helpers.ts";

function sources(dir: string, rel: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir).sort()) {
    const abs = join(dir, n);
    if (statSync(abs).isDirectory()) out.push(...sources(abs, `${rel}/${n}`));
    else if (n.endsWith(".ts")) out.push(`${rel}/${n}`);
  }
  return out;
}

describe("the journal read rule", () => {
  test("SCN-JRN-005-2 only the journal module and the report module name the journal file", () => {
    const names = sources(join(REPO, "src"), "src").filter((f) => /runs(\.1)?\.jsonl/.test(readFileSync(join(REPO, f), "utf8")));
    expect(names).toEqual(["src/journal/journal.ts"]);
  });

  test("SCN-JRN-005-2 only the report module reads the constants, and no source runs gh or opens a socket", () => {
    const readers = sources(join(REPO, "src"), "src").filter((f) => /JOURNAL_FILE|ROTATED_FILE/.test(readFileSync(join(REPO, f), "utf8")));
    expect(readers).toEqual(["src/journal/journal.ts", "src/journal/report.ts"]);
    const report = readFileSync(join(REPO, "src/journal/report.ts"), "utf8");
    expect(report).not.toMatch(/child_process|node:net|node:http|node:https|fetch\(|\bgh\b\s*\(/);
    const cli = readFileSync(join(REPO, "src/cli.ts"), "utf8");
    expect(cli).not.toMatch(/child_process|node:net|node:http|fetch\(/);
  });
});
