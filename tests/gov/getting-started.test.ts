// Covers: REQ-ADOPT-009
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { REPO } from "../helpers.ts";

const guide = readFileSync(join(REPO, "docs/getting-started.md"), "utf8");
const readme = readFileSync(join(REPO, "README.md"), "utf8");

describe("getting started guide", () => {
  test("SCN-ADOPT-009-3 the guide shows the fresh path on upstream OpenSpec and the README links it", () => {
    expect(guide).toContain("npx -y @fission-ai/openspec@latest init --tools <tool>");
    expect(guide).toContain("npx -y spec-ctx@latest init --all");
    expect(guide).toContain("openspec new change add-greeting");
    // a retitle under a stable ID needs a RENAMED block, and check prints it
    expect(guide).toContain("## RENAMED Requirements");
    expect(guide).toContain("retitle-needs-renamed");
    // no fork, no tarball
    expect(guide.toLowerCase()).not.toContain("fork");
    expect(guide.toLowerCase()).not.toContain("tarball");
    expect(guide).not.toContain(".tgz");
    expect(guide).not.toContain("task backfill");
    expect(readme).toContain("](docs/getting-started.md)");
  });
});
