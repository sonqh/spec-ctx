// Covers: REQ-STAT-005
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

function runLocal(steps: string[], path = process.env.PATH): { code: number; out: string } {
  mkdirSync(p.path("scripts"), { recursive: true });
  cpSync(join(REPO, "scripts/ci-local.sh"), p.path("scripts/ci-local.sh"));
  writeFileSync(p.path("steps.txt"), steps.join("\n") + "\n");
  const r = spawnSync("bash", [p.path("scripts/ci-local.sh")], { encoding: "utf8", env: { ...process.env, PATH: path, SPECCTX_CI_STEPS_FILE: p.path("steps.txt") } });
  return { code: r.status ?? -1, out: r.stdout + r.stderr };
}
const log = (): Record<string, unknown>[] => readFileSync(p.path(".ctx/gate-log.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

describe("gate log", () => {
  test("SCN-STAT-005-1 a failing run appends ok false and the failing step", () => {
    p = new Project(null);
    // a fake bun on the PATH fails, as a red test run would
    mkdirSync(p.path("bin"));
    writeFileSync(p.path("bin/bun"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    const r = runLocal(["true", "bun run test", "true"], `${p.path("bin")}:${process.env.PATH}`);
    expect(r.code).toBe(1);
    expect(r.out).toContain("ci-local: fail: bun run test");
    const last = log().at(-1)!;
    expect(last).toMatchObject({ ok: false, failed_step: "bun run test", steps: 2 });
    expect(typeof last.at).toBe("string");
    expect(typeof last.duration_s).toBe("number");
  });

  test("a passing run appends ok true, and the log only grows", () => {
    p = new Project(null);
    expect(runLocal(["true", "true"]).code).toBe(0);
    expect(runLocal(["false"]).code).toBe(1);
    expect(runLocal(["true"]).code).toBe(0);
    const lines = log();
    expect(lines.map((l) => l.ok)).toEqual([true, false, true]);
    expect(lines[0]).toMatchObject({ failed_step: null, steps: 2 });
    expect(Object.keys(lines[0]!).sort()).toEqual(["at", "duration_s", "failed_step", "ok", "steps"]);
  });
});
