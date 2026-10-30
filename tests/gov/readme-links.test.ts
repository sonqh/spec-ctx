// Covers: REQ-GOV-011, REQ-ADOPT-001
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { NO_ID_FIXTURE, Project, REPO } from "../helpers.ts";

const OK = /^(https?:\/\/|mailto:|#)/;

/** Every target of a Markdown link or image, and every src or href value, that is not absolute or an anchor. */
export function relativeTargets(text: string): string[] {
  const out: string[] = [];
  let fence = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) fence = !fence;
    if (fence) continue;
    const found = [...line.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]!);
    found.push(...[...line.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]!));
    for (const t of found) if (!OK.test(t)) out.push(t);
  }
  return out;
}

const readme = readFileSync(join(REPO, "README.md"), "utf8");

describe("README links work on npm", () => {
  test("SCN-GOV-011-1 the README holds no relative target, and bad copies fail", () => {
    expect(relativeTargets(readme)).toEqual([]);
    expect(relativeTargets(`${readme}\nSee [guide](docs/getting-started.md).\n`)).toEqual(["docs/getting-started.md"]);
    expect(relativeTargets(`${readme}\n![clip](docs/demo/clips/1-adopt.svg)\n`)).toEqual(["docs/demo/clips/1-adopt.svg"]);
    expect(relativeTargets('<img src="docs/x.svg">')).toEqual(["docs/x.svg"]);
    expect(relativeTargets("[a](#two-paths) [b](https://example.com/x) [c](mailto:a@b.c)")).toEqual([]);
  });

  test("SCN-GOV-011-1 every repository image and link uses the sonqh/spec-ctx main URL", () => {
    const targets = [...readme.matchAll(/!?\[[^\]]*\]\((https:\/\/(?:github\.com|raw\.githubusercontent\.com)\/sonqh\/spec-ctx[^)\s]*)\)/g)].map((m) => m[1]!);
    expect(targets.length).toBeGreaterThanOrEqual(8);
    for (const t of targets) expect(t, t).toMatch(/^https:\/\/(github\.com\/sonqh\/spec-ctx\/blob\/main\/|raw\.githubusercontent\.com\/sonqh\/spec-ctx\/main\/)/);
    for (const m of readme.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) expect(m[1], m[1]).toMatch(/^https:\/\/raw\.githubusercontent\.com\/sonqh\/spec-ctx\/main\//);
  });

  test("SCN-GOV-011-2 the README says that adopt --dry-run exits 1, and it does", async () => {
    const line = readme.split("\n").find((l) => l.includes("`adopt --dry-run` exits 1"));
    expect(line).toBeDefined();
    expect(line!.split(/\s+/).length).toBeLessThanOrEqual(25);
    const p = new Project(NO_ID_FIXTURE);
    try {
      expect((await p.run("adopt", "--dry-run")).code).toBe(1);
    } finally {
      p.cleanup();
    }
  });
});
