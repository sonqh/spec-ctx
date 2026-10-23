// REQ-IDS-001 REQ-TASK-001 REQ-TASK-002 REQ-TASK-003 REQ-TASK-005 REQ-VER-002 REQ-HND-001 write commands.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "../config.ts";
import type { Index } from "../index/types.ts";
import type { Io } from "../main.ts";
import { dumps } from "../util/json.ts";
import type { Parsed } from "./args.ts";
import { UsageExit } from "./errors.ts";

export interface Ctx {
  root: string;
  cfg: Config;
  data: Index;
  p: Parsed;
  io: Io;
  json: boolean;
}

const arg = (c: Ctx, n: number, what: string): string => {
  const v = c.p.positional[n];
  if (v === undefined) throw new UsageExit(`${c.p.command} needs ${what}`);
  return v;
};
const noMore = (c: Ctx, n: number): void => {
  if (c.p.positional.length > n) throw new UsageExit(`${c.p.command} takes ${n} argument(s)`);
};
const print = (c: Ctx, v: unknown): void => c.io.out(dumps(v) + "\n");

export async function runWorkflow(c: Ctx): Promise<number> {
  const entries = c.data.entries;
  const f = c.p.flags;
  switch (c.p.command) {
    case "id new": {
      const { newIds } = await import("../ids/ids.ts");
      const kind = arg(c, 0, "a kind: REQ, SCN, ADR, or DEC");
      noMore(c, 2);
      const ids = newIds(c.root, c.cfg, entries, {
        kind, cap: c.p.positional[1], forReq: f.for as string | undefined, count: (f.count as number | undefined) ?? 1,
      });
      if (c.json) print(c, ids);
      else c.io.out(ids.map((i) => i + "\n").join(""));
      return 0;
    }
    case "id retire": {
      const { retire } = await import("../ids/ids.ts");
      const id = arg(c, 0, "an ID");
      const reason = c.p.positional.slice(1).join(" ");
      const row = retire(c.root, entries, id, reason);
      if (c.json) print(c, { retired: id, row });
      else c.io.out(`retired ${id} in decisions/retired-ids.md\n`);
      return 0;
    }
    case "task next": {
      noMore(c, 0);
      const { nextTask } = await import("../tasks/tasks.ts");
      const t = nextTask(c.root, entries, f.change as string | undefined);
      if (!t) {
        if (c.json) print(c, null);
        else c.io.out("no open task\n");
        return 1;
      }
      const bundleCommand = `specctx bundle ${t.reqs.join(" ")} --budget ${c.cfg.bundle.budget}`;
      if (c.json) {
        print(c, { bundle_command: bundleCommand, change: t.change, id: t.id, reqs: t.reqs, text: t.text, verify: t.verify.command });
      } else {
        c.io.out(`${t.id}  ${t.text}\nreqs: ${t.reqs.join(", ") || "none"}\nverify: ${t.verify.command ?? "manual"}\n`);
      }
      return 0;
    }
    case "task start": {
      const { findTask } = await import("../tasks/tasks.ts");
      const t = findTask(c.root, entries, arg(c, 0, "a task ID"));
      noMore(c, 1);
      if (t.done) throw new UsageExit(`task ${t.id} is done`);
      if (t.archived) throw new UsageExit(`task ${t.id} is in an archived change`);
      const { canon } = await import("../index/canonical.ts");
      const { bundle } = await import("../graph/bundle.ts");
      const ids = canon(entries);
      const known = t.reqs.filter((r) => ids.has(r));
      for (const r of t.reqs.filter((x) => !ids.has(x))) c.io.err(`warning: task ${t.id} cites ${r}, which the index does not hold\n`);
      const b = bundle(c.root, entries, known, c.cfg.bundle.budget, c.cfg.bundle.depth);
      const { isoNow } = await import("../util/time.ts");
      const { CURRENT_PATH } = await import("../handoff/handoff.ts");
      mkdirSync(join(c.root, ".ctx"), { recursive: true });
      writeFileSync(join(c.root, CURRENT_PATH), dumps({ started_at: isoNow(), task: t.id }) + "\n");
      if (c.json) print(c, { bundle: b, task: t.id });
      else c.io.out(b.text);
      return 0;
    }
    case "task verify":
    case "task done": {
      const { findTask, setBox, hasEvidence } = await import("../tasks/tasks.ts");
      const t = findTask(c.root, entries, arg(c, 0, "a task ID"));
      noMore(c, 1);
      const dry = c.p.command === "task verify";
      const manual = f.manual as string | undefined;
      if (!dry && manual !== undefined) {
        if (!manual.trim()) throw new UsageExit("--manual needs a note");
        if (t.done && hasEvidence(c.root, t)) throw new UsageExit(`task ${t.id} is done`);
        // a manual note records evidence without a run. On a task done by hand it backfills the evidence.
        const { writeEvidence } = await import("../tasks/evidence.ts");
        const rel = writeEvidence(c.root, t, entries, { command: t.verify.command, exit: null, stdout_sha256: null, stderr_tail: "" }, "manual", manual.trim());
        if (!t.done) setBox(c.root, t, true);
        clearCurrent(c.root, t.id);
        if (c.json) print(c, { evidence: rel, kind: "manual", task: t.id });
        else c.io.out(`done ${t.id} (manual). Evidence: ${rel}\n`);
        return 0;
      }
      if (!dry && t.done) throw new UsageExit(`task ${t.id} is done`);
      if (t.verify.command === null) {
        throw new UsageExit(`task ${t.id} has no Verify command. ${dry ? "Nothing to run" : 'A --manual "<note>" is required'}`);
      }
      const { runVerify, tail } = await import("../verify/run.ts");
      const r = await runVerify(t.verify.command, c.root, c.cfg.verify.timeout_s);
      const outTail = tail(r.output);
      if (dry) {
        if (c.json) print(c, { command: t.verify.command, exit: r.exit, tail: outTail, timed_out: r.timedOut });
        else c.io.out(`${outTail ? outTail + "\n" : ""}exit ${r.timedOut ? "timeout" : r.exit}\n`);
        return r.exit === 0 ? 0 : 1;
      }
      if (r.timedOut || r.exit !== 0) {
        const msg = r.timedOut ? `verify timed out after ${c.cfg.verify.timeout_s}s` : `verify failed with exit ${r.exit}`;
        if (c.json) print(c, { command: t.verify.command, error: msg, exit: r.exit, tail: outTail, task: t.id });
        else c.io.out(outTail ? outTail + "\n" : "");
        c.io.err(`specctx: ${msg}. Task ${t.id} stays open.\n`);
        return 1;
      }
      const { sha256 } = await import("../util/hash.ts");
      const { writeEvidence } = await import("../tasks/evidence.ts");
      // the Verify command can change tagged files, so the digests come from the tree after the run
      const { loadIndex } = await import("../index/build.ts");
      const after = loadIndex(c.root, c.cfg).data.entries;
      const rel = writeEvidence(c.root, t, after, {
        command: t.verify.command, exit: 0, stdout_sha256: sha256(r.stdout), stderr_tail: tail(r.stderr.toString("utf8")),
      }, "command");
      setBox(c.root, t, true);
      clearCurrent(c.root, t.id);
      if (c.json) print(c, { evidence: rel, kind: "command", task: t.id });
      else c.io.out(`done ${t.id}. Evidence: ${rel}\n`);
      return 0;
    }
    case "task reopen": {
      const { findTask, setBox } = await import("../tasks/tasks.ts");
      const t = findTask(c.root, entries, arg(c, 0, "a task ID"));
      const reason = c.p.positional.slice(1).join(" ").trim();
      if (!reason) throw new UsageExit("task reopen needs a reason");
      if (!t.done) throw new UsageExit(`task ${t.id} is open`);
      if (t.archived) throw new UsageExit(`task ${t.id} is in an archived change`);
      const { retireEvidence } = await import("../tasks/evidence.ts");
      const { addReopened } = await import("../handoff/handoff.ts");
      setBox(c.root, t, false);
      const moved = retireEvidence(c.root, t);
      addReopened(c.root, entries, t.id, reason);
      if (c.json) print(c, { evidence: moved, task: t.id });
      else c.io.out(`reopened ${t.id}.${moved ? ` Old evidence: ${moved}` : ""}\n`);
      return 0;
    }
    case "handoff write": {
      noMore(c, 0);
      const { writeHandoff, HANDOFF_PATH } = await import("../handoff/handoff.ts");
      const h = writeHandoff(c.root, entries);
      if (c.json) print(c, h);
      else c.io.out(`wrote ${HANDOFF_PATH}\n`);
      return 0;
    }
    case "handoff ask": {
      const { ask } = await import("../handoff/handoff.ts");
      const h = ask(c.root, entries, c.p.positional.join(" "));
      if (c.json) print(c, { open_questions: h.open_questions });
      else c.io.out(`open question ${h.open_questions.length} added\n`);
      return 0;
    }
    case "handoff resolve": {
      const { resolve } = await import("../handoff/handoff.ts");
      const n = arg(c, 0, "a question number");
      if (!/^\d+$/.test(n)) throw new UsageExit("handoff resolve needs a question number");
      const h = resolve(c.root, entries, Number(n), c.p.positional.slice(1).join(" "));
      if (c.json) print(c, { open_questions: h.open_questions, resolved: h.resolved });
      else c.io.out(`resolved question ${n}\n`);
      return 0;
    }
  }
  throw new UsageExit(`unknown command: ${c.p.command}`);
}

function clearCurrent(root: string, task: string): void {
  const p = join(root, ".ctx/current.json");
  if (!existsSync(p)) return;
  try {
    const cur = JSON.parse(readFileSync(p, "utf8")) as { task?: string };
    if (cur.task === task) rmSync(p);
  } catch {
    // a damaged current.json stays for the user to read
  }
}
