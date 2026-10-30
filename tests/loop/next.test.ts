// Covers: REQ-LOOP-001, REQ-LOOP-003, REQ-CLI-007, REQ-LOOP-004
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { chmodSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { ACTIONS, KEYS } from "../../src/loop/next.ts";
import { lintSte } from "../../src/lint/ste.ts";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

// The walk goes through every state of 024/D2 in order on one copy of the no-ID fixture.
// SPECCTX_OPENSPEC points at a shell script in the temp project that prints canned JSON, so nothing reaches the network.

let p: Project;
let OS: string;
const seen: Record<string, unknown>[] = [];
const outputs: string[] = [];
const CHANGE = "add-mfa";
const TASKS = `openspec/changes/${CHANGE}/tasks.md`;
const SPEC = `openspec/changes/${CHANGE}/specs/user-auth/spec.md`;

const PLANNING = JSON.stringify({ isPlanningComplete: false, nextSteps: ["Run openspec instructions design --change \"add-mfa\" --json before writing that artifact."] });
const COMPLETE = JSON.stringify({ isPlanningComplete: true, nextSteps: [] });

function stub(json: string, exit = 0): void {
  p.write("osstub/status.json", json + "\n");
  p.write("osstub/exit", String(exit) + "\n");
}

/** Every file under .ctx except the index cache, with its bytes. */
function ctxSnapshot(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (abs: string, rel: string): void => {
    for (const n of readdirSync(abs).sort()) {
      const q = join(abs, n);
      const r = rel ? `${rel}/${n}` : n;
      if (statSync(q).isDirectory()) walk(q, r);
      else if (r !== "index.json") out.set(r, readFileSync(q).toString("base64"));
    }
  };
  try {
    walk(p.path(".ctx"), "");
  } catch {
    // no .ctx yet
  }
  return out;
}

/** Run next in both forms. The JSON object is recorded for the enum test. The human form is recorded for the lint test. */
async function next(...args: string[]): Promise<Record<string, unknown>> {
  const before = ctxSnapshot();
  const j = await p.run("next", "--json", ...args);
  expect(j.code, j.err).toBe(0);
  const h = await p.run("next", ...args);
  expect(h.code, h.err).toBe(0);
  expect(ctxSnapshot()).toEqual(before);
  const obj = JSON.parse(j.out) as Record<string, unknown>;
  expect(Object.keys(obj)).toEqual([...KEYS]);
  seen.push(obj);
  outputs.push(h.out);
  // the human form: action first, next last, one line per other key
  const lines = h.out.trimEnd().split("\n");
  expect(lines[0]).toBe(`action: ${obj.action}`);
  expect(lines.at(-1)).toBe(`next: ${obj.command ?? "none"}`);
  expect(lines.length).toBe(KEYS.length);
  return obj;
}

const base = (o: Record<string, unknown>): Record<string, unknown> => {
  const r = { action: "stop", attempt: 0, change: CHANGE, command: null, human: false, max_attempts: 3, reason: null, state: "unknown", task: null, ...o };
  return { tasks: r.task === null ? [] : [r.task], ...r };
};

beforeAll(() => {
  p = new Project(NO_ID_FIXTURE);
  OS = p.path("osstub/openspec");
  p.write("osstub/openspec", "#!/bin/sh\nhere=$(dirname \"$0\")\ncat \"$here/status.json\"\ncode=$(cat \"$here/exit\")\n[ \"$code\" = 0 ] || echo \"Change 'add-mfa' not found\" >&2\nexit \"$code\"\n");
  chmodSync(OS, 0o755);
  stub(COMPLETE);
  process.env.SPECCTX_OPENSPEC = OS;
  process.env.SPECCTX_NOW = "2026-10-28T10:00:00.000Z";
});

afterAll(() => {
  delete process.env.SPECCTX_OPENSPEC;
  delete process.env.SPECCTX_NOW;
  p?.cleanup();
});

describe("specctx next walks the decision order", () => {
  test("SCN-LOOP-001-2 no change: plan with new change", async () => {
    const q = new Project(NO_ID_FIXTURE);
    try {
      rmSync(q.path(`openspec/changes/${CHANGE}`), { recursive: true });
      const r = await q.run("next", "--json");
      expect(r.code, r.err).toBe(0);
      expect(JSON.parse(r.out)).toEqual(base({ action: "plan", change: null, command: `${OS} new change <name>`, human: true, reason: "no active change", state: "no_change" }));
      // a --change that names no folder gives the same, with the name filled
      const n = await p.run("next", "--json", "--change", "nope");
      expect(JSON.parse(n.out)).toEqual(base({ action: "plan", change: "nope", command: `${OS} new change nope`, human: true, reason: "no change nope", state: "no_change" }));
    } finally {
      q.cleanup();
    }
  });

  test("SCN-LOOP-001-4 an open question for the change comes before every other rule", async () => {
    stub(PLANNING);
    p.write(".ctx/questions.json", JSON.stringify([{ n: 1, asked_at: "2026-10-28", task: `${CHANGE}/1.3`, text: "Keep the 15 minute timeout?", status: "open" }]) + "\n");
    expect(await next()).toEqual(base({ action: "ask", command: 'specctx handoff resolve 1 "<answer>"', human: true, reason: "Keep the 15 minute timeout?", state: "question_open", task: `${CHANGE}/1.3` }));
    // a question with task none blocks nothing
    p.write(".ctx/questions.json", JSON.stringify([{ n: 1, asked_at: "2026-10-28", task: "none", text: "Keep the 15 minute timeout?", status: "open" }]) + "\n");
    expect((await next()).action).toBe("plan");
    rmSync(p.path(".ctx/questions.json"));
  });

  test("SCN-LOOP-001-2 planning incomplete: plan with nextSteps[0]. A failed command: stop", async () => {
    stub(PLANNING);
    expect(await next()).toEqual(base({
      action: "plan", command: "Run openspec instructions design --change \"add-mfa\" --json before writing that artifact.", human: true, reason: "planning is not complete", state: "planning",
    }));
    stub(JSON.stringify({ isPlanningComplete: false, nextSteps: [] }));
    expect((await next()).command).toBe(`${OS} status --change ${CHANGE}`);
    stub("{}", 1);
    expect(await next()).toEqual(base({ action: "stop", reason: "openspec status failed (exit 1): Change 'add-mfa' not found", state: "openspec_failed" }));
    stub("not json");
    expect((await next()).state).toBe("openspec_failed");
    // the JSON error of OpenSpec on stdout gives the reason
    stub(JSON.stringify({ status: [{ severity: "error", code: "change_error", message: "Schema 'spec-driven-ids' not found. Available schemas: spec-driven" }] }), 1);
    expect((await next()).reason).toBe("openspec status failed (exit 1): Schema 'spec-driven-ids' not found. Available schemas: spec-driven");
    stub(COMPLETE);
  });

  test("SCN-LOOP-001-3 cite: a header without an ID or a task without a REQ", async () => {
    expect(await next()).toEqual(base({
      action: "cite", command: `specctx query --change ${CHANGE} --kind req`, reason: `missing-id Second factor at ${SPEC}:5`, state: "citation_missing", task: `${CHANGE}/1.1`,
    }));
    // IDs in the delta, then the tasks still lack a REQ and a Verify
    p.write(SPEC, "# user-auth\n\n## ADDED Requirements\n\n### Requirement: REQ-UA-001 Second factor\nThe system SHALL ask for a TOTP code after a valid password.\n\n#### Scenario: SCN-UA-001-1 Valid code\n- **WHEN** the user enters the current TOTP code\n- **THEN** the system opens a session\n");
    p.touchForward(SPEC);
    const r = await next();
    expect(r.action).toBe("cite");
    expect(r.reason).toBe(`task-without-req ${CHANGE}/1.1 at ${TASKS}:5`);
    // SCN-LOOP-004-1 a weak Verify on the first open task is a citation gap
    p.write(TASKS, "# Tasks\n\n## 1. Second factor\n\n- [ ] 1.1 Add the TOTP secret store [REQ-UA-001] Verify: `true`\n- [ ] 1.2 Shorten the session timeout [REQ-UA-001] Verify: `node -e 0`\n");
    p.touchForward(TASKS);
    expect(await next()).toEqual(base({
      action: "cite", command: `specctx query --change ${CHANGE} --kind req`, reason: `weak-verify ${CHANGE}/1.1 at ${TASKS}:5`, state: "citation_missing", task: `${CHANGE}/1.1`,
    }));
    // SCN-LOOP-004-2 a real command clears the gap
    p.write(TASKS, p.read(TASKS).replace("Verify: `true`", "Verify: `bun test tests/a.test.ts`"));
    p.touchForward(TASKS, 6000);
    expect(await next()).toEqual(base({ action: "start", command: `specctx task start ${CHANGE}/1.1`, state: "task_open", task: `${CHANGE}/1.1` }));
    p.write(TASKS, "# Tasks\n\n## 1. Second factor\n\n- [x] 1.1 Add the TOTP secret store [REQ-UA-001] Verify: `node -e 0`\n- [x] 1.2 Shorten the session timeout [REQ-UA-001] Verify: `node -e 0`\n- [ ] 1.3 Add the TOTP prompt to the login form [REQ-UA-001] Verify: `echo boom && exit 1`\n");
    p.touchForward(TASKS);
  });

  test("SCN-LOOP-001-3 repair: a ticked task without evidence", async () => {
    expect(await next()).toEqual(base({ action: "repair", command: `specctx task done ${CHANGE}/1.1`, state: "done_without_evidence", task: `${CHANGE}/1.1` }));
    expect((await p.run("task", "done", `${CHANGE}/1.1`)).code).toBe(0);
    expect((await next()).task).toBe(`${CHANGE}/1.2`);
    expect((await p.run("task", "done", `${CHANGE}/1.2`)).code).toBe(0);
  });

  test("SCN-LOOP-001-3 start, work, fix, and the cap", async () => {
    expect(await next()).toEqual(base({ action: "start", command: `specctx task start ${CHANGE}/1.3`, state: "task_open", task: `${CHANGE}/1.3` }));
    process.env.SPECCTX_NOW = "2026-10-28T10:10:00.000Z";
    expect((await p.run("task", "start", `${CHANGE}/1.3`)).code).toBe(0);
    expect(await next()).toEqual(base({ action: "work", command: `specctx task done ${CHANGE}/1.3`, state: "task_started", task: `${CHANGE}/1.3` }));
    process.env.SPECCTX_NOW = "2026-10-28T10:11:00.000Z";
    expect((await p.run("task", "done", `${CHANGE}/1.3`)).code).toBe(1);
    expect(await next()).toEqual(base({
      action: "fix", attempt: 1, command: `specctx task done ${CHANGE}/1.3`, reason: "Verify failed (exit 1): boom", state: "task_failed", task: `${CHANGE}/1.3`,
    }));
    process.env.SPECCTX_NOW = "2026-10-28T10:12:00.000Z";
    await p.run("task", "done", `${CHANGE}/1.3`);
    process.env.SPECCTX_NOW = "2026-10-28T10:13:00.000Z";
    const cap = await p.run("task", "done", `${CHANGE}/1.3`);
    expect(cap.out).toContain("blocked: question 1 written.");
    // the question that task done wrote blocks the change
    const ask = await next();
    expect(ask).toEqual(base({
      action: "ask", attempt: 3, command: 'specctx handoff resolve 1 "<answer>"', human: true,
      reason: `task ${CHANGE}/1.3 failed Verify 3 times. Last: boom. What should change?`, state: "question_open", task: `${CHANGE}/1.3`,
    }));
    // without the question file the cap still stops the loop, and next names the question to ask
    const saved = p.read(".ctx/questions.json");
    rmSync(p.path(".ctx/questions.json"));
    expect(await next()).toEqual(base({
      action: "ask", attempt: 3, command: `specctx handoff ask "task ${CHANGE}/1.3 failed Verify 3 times. Last: boom. What should change?"`, human: true,
      reason: "Verify failed (exit 1): boom", state: "attempts_exhausted", task: `${CHANGE}/1.3`,
    }));
    p.write(".ctx/questions.json", saved);
    // a resolve resets the window, so the loop goes back to work
    process.env.SPECCTX_NOW = "2026-10-28T10:14:00.000Z";
    expect((await p.run("handoff", "resolve", "1", "mock the clock")).code).toBe(0);
    expect(await next()).toEqual(base({ action: "work", command: `specctx task done ${CHANGE}/1.3`, state: "task_started", task: `${CHANGE}/1.3` }));
    // a current.json that names a done task is stale and changes nothing
    rmSync(p.path(".ctx/current.json"));
    expect((await next()).action).toBe("start");
  });

  test("SCN-LOOP-001-4 gate, then archive with the human flag from [loop] archive", async () => {
    p.write(TASKS, p.read(TASKS).replace("Verify: `echo boom && exit 1`", "Verify: `node -e 0`"));
    p.touchForward(TASKS);
    process.env.SPECCTX_NOW = "2026-10-28T10:20:00.000Z";
    expect((await p.run("task", "done", `${CHANGE}/1.3`)).code).toBe(0);
    expect(await next()).toEqual(base({ action: "gate", command: "specctx gate --strict", state: "gate_due" }));
    // a pass before the newest evidence does not count, and a failed run does not count
    p.write(".ctx/gate-log.jsonl", JSON.stringify({ at: "2026-10-28T10:15:00.000Z", duration_s: 1, failed_step: null, ok: true, steps: [] }) + "\n");
    expect((await next()).action).toBe("gate");
    p.append(".ctx/gate-log.jsonl", JSON.stringify({ at: "2026-10-28T10:21:00.000Z", duration_s: 1, failed_step: "check", ok: false, steps: ["check"] }) + "\n");
    expect((await next()).action).toBe("gate");
    p.append(".ctx/gate-log.jsonl", JSON.stringify({ at: "2026-10-28T10:22:00.000Z", duration_s: 1, failed_step: null, ok: true, steps: [] }) + "\n");
    // REQ-LOOP-007 the archive stop under ask names the archive question (031/D2)
    expect(await next()).toEqual(base({ action: "archive", command: `specctx handoff ask --change ${CHANGE} "archive ${CHANGE}?"`, human: true, state: "gate_passed" }));
    p.write("spec-ctx.toml", "[loop]\narchive = \"auto\"\n");
    expect(await next()).toEqual(base({ action: "archive", command: `${OS} archive ${CHANGE} -y`, human: false, state: "gate_passed" }));
    rmSync(p.path("spec-ctx.toml"));
  });

  test("SCN-LOOP-001-1 every action over every state is in the closed list", () => {
    expect(seen.length).toBeGreaterThanOrEqual(14);
    const actions = new Set(seen.map((o) => o.action));
    for (const a of actions) expect(ACTIONS, String(a)).toContain(a);
    // the walk reached every action of the list
    expect([...ACTIONS].filter((a) => !actions.has(a))).toEqual([]);
  });

  test("SCN-LOOP-001-1 the human form of every state passes lint ste with baseline 0", () => {
    expect(outputs.length).toBe(seen.length);
    for (const text of outputs) {
      // the OpenSpec sentence and the question text are quoted data, not help text
      const own = text.split("\n").filter((l) => !l.startsWith("next: Run openspec") && !l.startsWith("reason: ") && !l.includes("handoff ask"));
      const hard = lintSte(own.join("\n")).findings.filter((f) => f.level === "advisory-free");
      expect(hard, text).toEqual([]);
    }
  });

  test("the flag and the usage errors", async () => {
    const r = await p.run("next", "extra");
    expect(r.code).toBe(2);
    expect(r.err).toContain("next takes no arguments");
    expect((await p.run("next", "--change")).code).toBe(2);
    expect((await p.run("next", "--change", CHANGE, "--json")).code).toBe(0);
  });
});
