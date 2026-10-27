// REQ-IDS-001 REQ-TASK-001 REQ-TASK-002 REQ-TASK-003 REQ-TASK-005 REQ-VER-002 REQ-HND-001 write commands.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "../config.ts";
import type { Index } from "../index/types.ts";
import type { Io } from "../main.ts";
import { dumps } from "../util/json.ts";
import type { Parsed } from "./args.ts";
import { paint } from "./color.ts";
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
        else {
          // REQ-TASK-001 name the next step. The exit code stays 1.
          const { activeChanges } = await import("../tasks/tasks.ts");
          const { matchesChange } = await import("../index/scan.ts");
          const want = f.change as string | undefined;
          const ready = activeChanges(entries).filter((x) => !want || matchesChange(x, want));
          c.io.out(ready.length
            ? `no open task. Every task in the active changes is done. Next: archive ${ready.join(", ")}.\n`
            : "no open task. No active change has a task.\n");
        }
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
      const { cpLen } = await import("../util/pystr.ts");
      // REQ-STAT-002 the bundle size goes next to the current task, so stats can compute the context ratio
      writeFileSync(join(c.root, CURRENT_PATH), dumps({ bundle_chars: cpLen(b.text), started_at: isoNow(), task: t.id }) + "\n");
      // REQ-TASK-002 a task that cites no REQ gets one hint line, so the agent knows what to add
      const hint = t.reqs.length ? null : `task ${t.id} cites no REQ. Run specctx query --change ${t.change} --kind req to list its requirements, then add [REQ-<CAP>-NNN] to the task line.`;
      if (c.json) print(c, { bundle: b, hint, task: t.id });
      else c.io.out(b.text + (hint ? hint + "\n" : "") + footer(cpLen(b.text), (await import("../stats/stats.ts")).specCharsOf(entries)));
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
        else c.io.out(paint("ok", `done ${t.id} (manual). Evidence: ${rel}\n`, c.io.tty));
        return 0;
      }
      if (!dry && t.done) throw new UsageExit(`task ${t.id} is done`);
      if (t.verify.command === null) {
        throw new UsageExit(`task ${t.id} has no Verify command. ${dry ? "Nothing to run" : 'A --manual "<note>" is required'}`);
      }
      const { runVerify, tail } = await import("../verify/run.ts");
      const { resolve: resolvePath, relative, isAbsolute } = await import("node:path");
      let dir = c.root;
      if (t.verify.cwd !== undefined) {
        // REQ-VER-004 the cwd prefix must stay inside the project root
        dir = resolvePath(c.root, t.verify.cwd);
        const rel = relative(c.root, dir);
        if (rel.startsWith("..") || isAbsolute(rel)) throw new UsageExit(`the Verify cwd ${t.verify.cwd} is outside the project root`);
        const { existsSync: exists } = await import("node:fs");
        if (!exists(dir)) throw new UsageExit(`the Verify cwd ${t.verify.cwd} does not exist`);
      }
      const r = await runVerify(t.verify.command, dir, c.cfg.verify.timeout_s);
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
        // REQ-VER-003 a timeout keeps its own line on stderr
        if (r.timedOut) c.io.err(`specctx: ${msg}. Task ${t.id} stays open.\n`);
        // REQ-TASK-003 the refusal is the last line of the output. REQ-CLI-008 it is red on a TTY.
        else if (!c.json) c.io.out(paint("fail", `Verify failed (exit ${r.exit}). The task stays open.\n`, c.io.tty));
        return 1;
      }
      const { sha256 } = await import("../util/hash.ts");
      const { writeEvidence } = await import("../tasks/evidence.ts");
      // the Verify command can change tagged files, so the digests come from the tree after the run
      const { loadIndex } = await import("../index/build.ts");
      const after = loadIndex(c.root, c.cfg).data.entries;
      const rel = writeEvidence(c.root, t, after, {
        command: t.verify.command, exit: 0, stdout_sha256: sha256(r.stdout), stderr_tail: tail(r.stderr.toString("utf8")),
      }, "command", undefined, t.verify.cwd);
      setBox(c.root, t, true);
      clearCurrent(c.root, t.id);
      if (c.json) print(c, { evidence: rel, kind: "command", task: t.id });
      else c.io.out(paint("ok", `done ${t.id}. Evidence: ${rel}\n`, c.io.tty)); // REQ-CLI-008
      return 0;
    }
    case "task backfill": {
      // REQ-TASK-006 manual evidence for every ticked task of an active change that has none, through the task done --manual path.
      // Archived changes stay untouched (017/D1).
      noMore(c, 0);
      const note = (f.manual as string | undefined)?.trim();
      if (!note) throw new UsageExit('task backfill needs --manual "<note>"');
      const { tasksOf, toTask, hasEvidence } = await import("../tasks/tasks.ts");
      const { matchesChange } = await import("../index/scan.ts");
      const { writeEvidence } = await import("../tasks/evidence.ts");
      const want = f.change as string | undefined;
      const counts = new Map<string, number>();
      for (const e of tasksOf(entries)) {
        if (e.status !== "done" || e.file.includes("/archive/")) continue;
        if (want && !matchesChange(e.change, want)) continue;
        if (hasEvidence(c.root, e)) continue;
        const t = toTask(c.root, e);
        writeEvidence(c.root, t, entries, { command: t.verify.command, exit: null, stdout_sha256: null, stderr_tail: "" }, "manual", note);
        counts.set(e.change, (counts.get(e.change) ?? 0) + 1);
      }
      const { cmpStr } = await import("../util/pystr.ts");
      const rows = [...counts.keys()].sort(cmpStr).map((k) => ({ change: k, count: counts.get(k)! }));
      const total = rows.reduce((n, r) => n + r.count, 0);
      if (c.json) print(c, { changes: rows, total });
      else c.io.out(rows.map((r) => `${r.change}: ${r.count}\n`).join("") + `backfilled ${total} task(s)\n`);
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
      const moved = retireEvidence(c.root, t, reason);
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

// REQ-TASK-002 the footer of task start: the bundle size and its share of the spec text. bundle never prints it.
export function footer(n: number, m: number): string {
  const p = m > 0 ? Math.round((n / m) * 1000) / 10 : 0;
  return `-- bundle ${n} chars, ${p}% of ${m} chars of spec text\n`;
}
