// Covers: REQ-CLI-010
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { REPO } from "../helpers.ts";

// Files that name the tool in help or usage text or in a report, not as a command to paste (043/D2).
const ALLOWED = ["src/cli/help.ts", "src/lint/cli.ts", "src/stats/write.ts", "src/adopt/write.ts", "src/runcmd.ts", "src/assets.generated.ts"];
const BARE = /specctx [a-z-]/;

function sources(dir: string, rel = ""): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir).sort()) {
    const abs = join(dir, n);
    const r = rel ? `${rel}/${n}` : n;
    if (statSync(abs).isDirectory()) out.push(...sources(abs, r));
    else if (n.endsWith(".ts")) out.push(r);
  }
  return out;
}

/** The lines that hold `specctx <word>` in code, not in a comment. */
export function bareLines(text: string): number[] {
  const hits: number[] = [];
  text.split("\n").forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    const code = line.replace(/\s\/\/\s.*$/, "");
    if (BARE.test(code)) hits.push(i + 1);
  });
  return hits;
}

describe("printed commands go through runCommand", () => {
  test("SCN-CLI-010-5 no source file outside the allowlist holds a bare specctx command", () => {
    const found: string[] = [];
    for (const f of sources(join(REPO, "src"), "src")) {
      if (ALLOWED.includes(f)) continue;
      for (const n of bareLines(readFileSync(join(REPO, f), "utf8"))) found.push(`${f}:${n}`);
    }
    expect(found).toEqual([]);
  });

  test("SCN-CLI-010-5 a planted bare command is found and a comment is not", () => {
    const planted = ['// specctx next is the loop', 'const a = `specctx task done ${id}`;', "const b = 1; // specctx status"].join("\n");
    expect(bareLines(planted)).toEqual([2]);
  });
});
