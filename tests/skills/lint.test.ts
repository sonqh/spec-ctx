// Covers: REQ-SKL-001, REQ-SKL-003, REQ-SKL-004
import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "../helpers.ts";

const CLI = join(REPO, "dist/cli.js");
const RUN = "specctx-run";
const ALIASES = ["specctx-bootstrap", "specctx-next", "specctx-done"];
const SKILLS = [RUN, ...ALIASES];
const file = (s: string): string => join(REPO, "skills", s, "SKILL.md");

describe("skills", () => {
  test("the run skill and the three aliases exist and nothing else", () => {
    expect(readdirSync(join(REPO, "skills")).sort()).toEqual([...SKILLS].sort());
    for (const s of SKILLS) {
      const text = readFileSync(file(s), "utf8");
      expect(text.startsWith(`---\nname: ${s}\ndescription: `)).toBe(true);
    }
  });

  test("SCN-SKL-001-1 every SKILL.md is under 60 lines", () => {
    for (const s of SKILLS) {
      const lines = readFileSync(file(s), "utf8").split("\n").length - 1;
      expect(lines, s).toBeLessThan(60);
    }
  });

  test("SCN-SKL-001-2 both linters pass with baseline 0", () => {
    for (const s of SKILLS) {
      const t = spawnSync(process.execPath, [CLI, "lint", "tells", "--baseline", "0", file(s)], { encoding: "utf8" });
      expect(t.status, t.stdout).toBe(0);
      const ste = spawnSync(process.execPath, [CLI, "lint", "ste", "--baseline", "0", "--disable", "synonym-rotation", file(s)], { encoding: "utf8" });
      expect(ste.status, ste.stdout).toBe(0);
    }
  });

  test("SCN-SKL-001-3 the run skill names the loop, every action, the upstream propose skill, and the commands", () => {
    const text = readFileSync(file(RUN), "utf8");
    const need = [
      "specctx next --json",
      "specctx handoff write",
      "openspec-propose",
      "specctx task start <t>",
      "specctx task done <t>",
      "specctx gate --strict",
      "specctx query --change <c> --kind req",
      "specctx check --strict",
      "specctx id new",
    ];
    for (const c of need) expect(text, c).toContain(c);
    for (const a of ["plan", "cite", "start", "work", "fix", "repair", "gate", "archive", "ask", "stop"]) {
      expect(text, a).toMatch(new RegExp(`^- \`${a}\``, "m"));
    }
    for (const t of ['"run"', '"continue"', '"next task"', '"build this"', '"carry on"']) expect(text, t).toContain(t);
  });

  test("SCN-SKL-003-1 the plan action takes a kebab case name, reads through specctx, and ends with the plan stop question", () => {
    const text = readFileSync(file(RUN), "utf8");
    for (const c of ["kebab case", "specctx bundle", "specctx query", "never `openspec show`", 'specctx handoff ask --change <c> "plan ready for <c>. Approve to start the tasks?"']) expect(text, c).toContain(c);
  });

  test("SCN-SKL-003-2 the archive action runs the guidance and the command field, with the default OpenSpec command", () => {
    const text = readFileSync(file(RUN), "utf8");
    for (const c of ["operations.archive.guidance", "the command in the `command` field", "npx -y @fission-ai/openspec@latest"]) expect(text, c).toContain(c);
    expect(text).not.toContain("openspec-archive-change");
  });

  const bullet = (text: string, a: string): string => text.split("\n").find((l) => l.startsWith(`- \`${a}\`:`)) ?? "";

  test("SCN-SKL-004-1 the plan bullet runs the gate and names id new --count", () => {
    const plan = bullet(readFileSync(file(RUN), "utf8"), "plan");
    for (const c of ["specctx gate --strict", "specctx id new --count <n>"]) expect(plan, c).toContain(c);
    expect(plan).not.toContain("openspec validate <c> --strict");
  });

  test("SCN-SKL-004-2 the archive bullet asks the archive question and covers the approval, and repair runs the command field", () => {
    const text = readFileSync(file(RUN), "utf8");
    const archive = bullet(text, "archive");
    for (const c of ['specctx handoff ask --change <c> "archive <c>?"', "When `human` is false, the user approved"]) expect(archive, c).toContain(c);
    expect(bullet(text, "repair")).toContain("the command in the `command` field");
  });

  test("SCN-SKL-001-4 each old skill is a six line alias that names specctx-run", () => {
    for (const s of ALIASES) {
      const text = readFileSync(file(s), "utf8");
      expect(text.split("\n").length - 1, s).toBe(6);
      expect(text, s).toContain(`name: ${s}\n`);
      expect(text, s).toContain("This skill is now `specctx-run`. Run it.");
    }
  });

  test("SCN-SKL-001-5 the run skill forbids the four bypasses", () => {
    const text = readFileSync(file(RUN), "utf8");
    expect(text).toContain("Never tick a checkbox by hand");
    expect(text).toContain("Never use `--manual` on a task with a Verify command");
    expect(text).toContain("Never call `/opsx:apply`");
    expect(text).toContain("Never read `openspec/specs/`");
    expect(text).toContain("not in the list");
  });
});
